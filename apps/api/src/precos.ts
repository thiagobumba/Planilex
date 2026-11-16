import { db } from "./db.js";
import { env } from "./env.js";
import { ErroHttp } from "./erros.js";

/** Uma oferta encontrada no Google Shopping (via SerpApi). */
export interface OfertaEncontrada {
  titulo: string;
  loja: string;
  preco: number;
  precoTexto: string;
  entrega: string | null;
  link: string;
  imagem: string | null;
}

export interface ResultadoBusca {
  termo: string;
  consultadoEm: string;
  emCache: boolean;
  ofertas: OfertaEncontrada[];
}

/** Por quanto tempo uma busca guardada é reaproveitada. */
export const VALIDADE_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_OFERTAS = 60;

/** "  Ar  Condicionado 9000 BTU " → "ar condicionado 9000 btu" */
export const normalizarTermo = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();

type ItemSerpApi = {
  title?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  delivery?: string;
  link?: string;
  product_link?: string;
  thumbnail?: string;
};

/** Converte a resposta do SerpApi em ofertas: só as que têm preço, da mais barata para a mais cara. */
export function extrairOfertas(resposta: { shopping_results?: ItemSerpApi[]; inline_shopping_results?: ItemSerpApi[] }) {
  const brutos = [...(resposta.shopping_results ?? []), ...(resposta.inline_shopping_results ?? [])];
  const vistos = new Set<string>();
  const ofertas: OfertaEncontrada[] = [];
  for (const r of brutos) {
    const link = r.link ?? r.product_link;
    if (typeof r.extracted_price !== "number" || r.extracted_price <= 0 || !r.title || !link) continue;
    const chave = `${r.source}|${r.title}|${r.extracted_price}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    ofertas.push({
      titulo: r.title,
      loja: r.source ?? "Loja não informada",
      preco: Math.round(r.extracted_price * 100) / 100,
      precoTexto: r.price ?? "",
      entrega: r.delivery ?? null,
      link,
      imagem: r.thumbnail ?? null,
    });
  }
  return ofertas.sort((a, b) => a.preco - b.preco).slice(0, MAX_OFERTAS);
}

/** Traduz os erros mais comuns do SerpApi. */
function explicarErro(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid api key")) return "O SerpApi recusou a SERPAPI_KEY do .env. Rode npm run precos:testar para conferir a chave e reinicie a API depois de corrigir.";
  if (m.includes("run out of searches") || m.includes("plan") || m.includes("limit")) {
    return "A cota de buscas do SerpApi deste mês acabou. Ela renova no começo do próximo ciclo (ou troque de plano).";
  }
  if (m.includes("hasn't returned any results") || m.includes("no results")) return null; // sem resultados não é erro
  return `O serviço de preços recusou a busca: ${mensagem}`;
}

/**
 * Busca preços no Google Shopping pelo SerpApi, para o Brasil.
 * Reaproveita a mesma busca por 24 h (tabela buscas_preco) para poupar a cota.
 * Documentação: docs/api.md › Busca de preços
 */
export async function buscarPrecos(termoDigitado: string, ignorarCache = false): Promise<ResultadoBusca> {
  const termo = normalizarTermo(termoDigitado);

  if (!ignorarCache) {
    const guardada = await db().buscaPreco.findUnique({ where: { termo } });
    if (guardada && Date.now() - guardada.criadoEm.getTime() < VALIDADE_CACHE_MS) {
      return { termo, consultadoEm: guardada.criadoEm.toISOString(), emCache: true, ofertas: guardada.resultado as unknown as OfertaEncontrada[] };
    }
  }

  if (!env.serpApiKey) {
    throw new ErroHttp(503, "A busca de preços não está configurada: falta a SERPAPI_KEY no .env (veja o README › Busca de preços).");
  }

  const url = new URL("/search.json", env.serpApiUrl);
  url.search = new URLSearchParams({
    engine: "google_shopping",
    q: termo,
    gl: "br",
    hl: "pt-br",
    google_domain: "google.com.br",
    api_key: env.serpApiKey,
  }).toString();

  let corpo: { error?: string; shopping_results?: ItemSerpApi[]; inline_shopping_results?: ItemSerpApi[] };
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    corpo = (await resposta.json()) as typeof corpo;
  } catch {
    throw new ErroHttp(502, "Não foi possível falar com o serviço de preços agora. Tente de novo em instantes.");
  }

  let ofertas: OfertaEncontrada[] = [];
  if (corpo.error) {
    const motivo = explicarErro(corpo.error);
    if (motivo) throw new ErroHttp(502, motivo);
  } else {
    ofertas = extrairOfertas(corpo);
  }

  const agora = new Date();
  await db().buscaPreco.upsert({
    where: { termo },
    create: { termo, resultado: ofertas as unknown as object, criadoEm: agora },
    update: { resultado: ofertas as unknown as object, criadoEm: agora },
  });
  return { termo, consultadoEm: agora.toISOString(), emCache: false, ofertas };
}
