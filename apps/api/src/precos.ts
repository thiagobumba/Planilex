import { db } from "./db.js";
import { ErroHttp } from "./erros.js";
import { buscarGoogle, googleConfigurado } from "./fontes/google.js";
import { buscarShopee, shopeeConfigurado } from "./fontes/shopee.js";
import { ErroFonte, type FontePreco, type OfertaEncontrada } from "./fontes/tipos.js";

export type { FontePreco, OfertaEncontrada } from "./fontes/tipos.js";

export interface ResultadoBusca {
  termo: string;
  consultadoEm: string;
  emCache: boolean;
  ofertas: OfertaEncontrada[];
  /** Fontes que responderam nesta busca. */
  fontes: FontePreco[];
  /** Fontes que falharam, com o motivo (as outras continuam aparecendo). */
  avisos: string[];
  /** Ofertas escondidas por estarem muito abaixo do preço típico (acessórios, peças). */
  ocultas: number;
}

/** O que fica guardado na tabela buscas_preco. */
type Guardado = Pick<ResultadoBusca, "ofertas" | "fontes" | "ocultas">;

/** Por quanto tempo uma busca guardada é reaproveitada. */
export const VALIDADE_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_OFERTAS = 60;
/** Abaixo desta fração da mediana, a oferta é tratada como acessório e escondida. */
const FRACAO_MINIMA_DA_MEDIANA = 0.25;
/** Só filtra com pelo menos esta quantidade de ofertas (com poucas, a mediana não diz nada). */
const MINIMO_PARA_FILTRAR = 6;

/** "  Ar  Condicionado 9000 BTU " → "ar condicionado 9000 btu" */
export const normalizarTermo = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();

const FONTES: { fonte: FontePreco; configurada: () => boolean; buscar: (termo: string) => Promise<OfertaEncontrada[]> }[] = [
  { fonte: "google", configurada: googleConfigurado, buscar: buscarGoogle },
  { fonte: "shopee", configurada: shopeeConfigurado, buscar: buscarShopee },
];

/**
 * Junta as ofertas das fontes: tira repetidas, esconde as muito abaixo do preço típico
 * (ex.: "suporte para ar-condicionado" numa busca de ar-condicionado) e ordena da mais barata.
 */
export function juntarOfertas(listas: OfertaEncontrada[][]): { ofertas: OfertaEncontrada[]; ocultas: number } {
  const vistos = new Set<string>();
  const todas: OfertaEncontrada[] = [];
  for (const o of listas.flat()) {
    const chave = `${o.fonte}|${o.loja}|${o.titulo}|${o.preco}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    todas.push(o);
  }
  todas.sort((a, b) => a.preco - b.preco);

  let ofertas = todas;
  if (todas.length >= MINIMO_PARA_FILTRAR) {
    const meio = Math.floor(todas.length / 2);
    const mediana = todas.length % 2 ? todas[meio].preco : (todas[meio - 1].preco + todas[meio].preco) / 2;
    ofertas = todas.filter((o) => o.preco >= mediana * FRACAO_MINIMA_DA_MEDIANA);
  }
  return { ofertas: ofertas.slice(0, MAX_OFERTAS), ocultas: todas.length - ofertas.length };
}

/** Buscas guardadas antes de existirem várias fontes eram só a lista de ofertas do Google. */
function lerGuardado(resultado: unknown): Guardado {
  if (Array.isArray(resultado)) {
    return { ofertas: (resultado as OfertaEncontrada[]).map((o) => ({ ...o, fonte: o.fonte ?? "google" })), fontes: ["google"], ocultas: 0 };
  }
  return resultado as Guardado;
}

/**
 * Busca preços nas fontes configuradas (Google Shopping pelo SerpApi e Shopee), ao mesmo tempo.
 * Reaproveita a mesma busca por 24 h (tabela buscas_preco) para poupar as cotas.
 * Documentação: docs/api.md › Busca de preços
 */
export async function buscarPrecos(termoDigitado: string, ignorarCache = false): Promise<ResultadoBusca> {
  const termo = normalizarTermo(termoDigitado);

  if (!ignorarCache) {
    const guardada = await db().buscaPreco.findUnique({ where: { termo } });
    if (guardada && Date.now() - guardada.criadoEm.getTime() < VALIDADE_CACHE_MS) {
      return { termo, consultadoEm: guardada.criadoEm.toISOString(), emCache: true, avisos: [], ...lerGuardado(guardada.resultado) };
    }
  }

  const ativas = FONTES.filter((f) => f.configurada());
  if (ativas.length === 0) {
    throw new ErroHttp(503, "A busca de preços não está configurada: falta a SERPAPI_KEY ou as chaves da Shopee no .env (veja o README › Busca de preços).");
  }

  const respostas = await Promise.allSettled(ativas.map((f) => f.buscar(termo)));
  const listas: OfertaEncontrada[][] = [];
  const fontes: FontePreco[] = [];
  const avisos: string[] = [];
  respostas.forEach((r, i) => {
    if (r.status === "fulfilled") {
      listas.push(r.value);
      fontes.push(ativas[i].fonte);
    } else {
      avisos.push(r.reason instanceof ErroFonte ? r.reason.message : `Falha inesperada em ${ativas[i].fonte}.`);
    }
  });
  if (fontes.length === 0) throw new ErroHttp(502, avisos.join(" "));

  const { ofertas, ocultas } = juntarOfertas(listas);
  const agora = new Date();
  // Só guarda quando todas as fontes responderam: assim a próxima busca tenta de novo a que falhou.
  if (avisos.length === 0) {
    const guardado: Guardado = { ofertas, fontes, ocultas };
    await db().buscaPreco.upsert({
      where: { termo },
      create: { termo, resultado: guardado as unknown as object, criadoEm: agora },
      update: { resultado: guardado as unknown as object, criadoEm: agora },
    });
  }
  return { termo, consultadoEm: agora.toISOString(), emCache: false, ofertas, fontes, avisos, ocultas };
}
