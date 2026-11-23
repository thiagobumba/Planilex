import { env } from "../env.js";
import { ErroFonte, centavos, type OfertaEncontrada } from "./tipos.js";

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

export const googleConfigurado = () => Boolean(env.serpApiKey);

/** Converte a resposta do SerpApi em ofertas (só as que têm preço e link, sem repetidas). */
export function extrairOfertasGoogle(resposta: { shopping_results?: ItemSerpApi[]; inline_shopping_results?: ItemSerpApi[] }) {
  const brutos = [...(resposta.shopping_results ?? []), ...(resposta.inline_shopping_results ?? [])];
  const ofertas: OfertaEncontrada[] = [];
  for (const r of brutos) {
    const link = r.link ?? r.product_link;
    if (typeof r.extracted_price !== "number" || r.extracted_price <= 0 || !r.title || !link) continue;
    ofertas.push({
      titulo: r.title,
      loja: r.source ?? "Loja não informada",
      preco: centavos(r.extracted_price),
      precoTexto: r.price ?? "",
      entrega: r.delivery ?? null,
      link,
      imagem: r.thumbnail ?? null,
      fonte: "google",
    });
  }
  return ofertas;
}

/** Traduz os erros mais comuns do SerpApi. `null` = não é erro (busca sem resultados). */
function explicarErro(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid api key")) return "O SerpApi recusou a SERPAPI_KEY do .env. Rode npm run precos:testar para conferir a chave e reinicie a API depois de corrigir.";
  if (m.includes("run out of searches") || m.includes("plan") || m.includes("limit")) {
    return "A cota de buscas do SerpApi deste mês acabou. Ela renova no começo do próximo ciclo (ou troque de plano).";
  }
  if (m.includes("hasn't returned any results") || m.includes("no results")) return null;
  return `O Google Shopping recusou a busca: ${mensagem}`;
}

/** Google Shopping no Brasil, pelo SerpApi. Cada chamada gasta 1 busca da cota. */
export async function buscarGoogle(termo: string): Promise<OfertaEncontrada[]> {
  const url = new URL("/search.json", env.serpApiUrl);
  url.search = new URLSearchParams({
    engine: "google_shopping",
    q: termo,
    gl: "br",
    hl: "pt-br",
    google_domain: "google.com.br",
    api_key: env.serpApiKey ?? "",
  }).toString();

  let corpo: { error?: string; shopping_results?: ItemSerpApi[]; inline_shopping_results?: ItemSerpApi[] };
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    corpo = (await resposta.json()) as typeof corpo;
  } catch {
    throw new ErroFonte("google", "Não foi possível falar com o Google Shopping agora.");
  }
  if (corpo.error) {
    const motivo = explicarErro(corpo.error);
    if (motivo) throw new ErroFonte("google", motivo);
    return [];
  }
  return extrairOfertasGoogle(corpo);
}
