import { createHash } from "node:crypto";
import { env } from "../env.js";
import { ErroFonte, centavos, formatarPreco, type OfertaEncontrada } from "./tipos.js";

/**
 * Shopee Brasil pela API de afiliados (GraphQL). Documentação: docs/arquitetura.md › Fontes de preço.
 * Assinatura: Authorization: SHA256 Credential={AppId}, Timestamp={ts}, Signature={sha256(AppId + ts + corpo + Secret)}
 */
export const shopeeConfigurado = () => Boolean(env.shopeeAppId && env.shopeeAppSecret);

/** Quantos produtos pedir à Shopee por busca (uma página só). */
const LIMITE = 50;

/**
 * Consulta com o termo escrito direto (JSON.stringify gera uma string GraphQL válida), sem variáveis:
 * assim não depende do tipo exato declarado no esquema da Shopee. sortType 1 = mais relevantes.
 */
const consulta = (termo: string) =>
  `query { productOfferV2(keyword: ${JSON.stringify(termo)}, sortType: 1, page: 1, limit: ${LIMITE}) { nodes { itemId productName priceMin shopName offerLink productLink imageUrl } } }`;

type NoShopee = {
  itemId?: number | string;
  productName?: string;
  priceMin?: string | number;
  shopName?: string;
  offerLink?: string;
  productLink?: string;
  imageUrl?: string;
};

type RespostaShopee = {
  data?: { productOfferV2?: { nodes?: NoShopee[] } };
  errors?: { message?: string; extensions?: { code?: number; message?: string } }[];
};

/** Monta o cabeçalho Authorization assinado para o corpo exato que será enviado. */
export function assinarShopee(appId: string, segredo: string, corpo: string, timestamp = Math.floor(Date.now() / 1000)) {
  const assinatura = createHash("sha256").update(`${appId}${timestamp}${corpo}${segredo}`).digest("hex");
  return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${assinatura}`;
}

export function extrairOfertasShopee(resposta: RespostaShopee): OfertaEncontrada[] {
  const ofertas: OfertaEncontrada[] = [];
  for (const n of resposta.data?.productOfferV2?.nodes ?? []) {
    const preco = Number(n.priceMin);
    const link = n.offerLink || n.productLink;
    if (!Number.isFinite(preco) || preco <= 0 || !n.productName || !link) continue;
    ofertas.push({
      titulo: n.productName,
      loja: n.shopName ? `${n.shopName} (Shopee)` : "Shopee",
      preco: centavos(preco),
      precoTexto: formatarPreco(preco),
      entrega: null,
      link,
      imagem: n.imageUrl ?? null,
      fonte: "shopee",
    });
  }
  return ofertas;
}

function explicarErro(erros: NonNullable<RespostaShopee["errors"]>) {
  const texto = erros.map((e) => `${e.extensions?.code ?? ""} ${e.extensions?.message ?? e.message ?? ""}`).join("; ").trim();
  const t = texto.toLowerCase();
  if (t.includes("10035") || t.includes("do not have access")) {
    return "A Shopee diz que este AppID ainda não tem acesso à API de afiliados. Confira em affiliate.shopee.com.br › Abrir API se o status está \"Válido\" e se o SHOPEE_APP_ID do .env é o mesmo.";
  }
  if (t.includes("signature") || t.includes("credential") || t.includes("10020") || t.includes("auth")) {
    return "A Shopee recusou o SHOPEE_APP_ID ou o SHOPEE_APP_SECRET do .env. Confira em affiliate.shopee.com.br › Abrir API e reinicie a API.";
  }
  if (t.includes("limit") || t.includes("frequen") || t.includes("10030")) return "A Shopee pediu para esperar um pouco antes de buscar de novo.";
  return `A Shopee recusou a busca: ${texto || "erro sem descrição"}`;
}

export async function buscarShopee(termo: string): Promise<OfertaEncontrada[]> {
  const corpo = JSON.stringify({ query: consulta(termo) });
  let resposta: RespostaShopee;
  try {
    const r = await fetch(env.shopeeApiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: assinarShopee(env.shopeeAppId!, env.shopeeAppSecret!, corpo) },
      body: corpo,
      signal: AbortSignal.timeout(20_000),
    });
    resposta = (await r.json()) as RespostaShopee;
  } catch {
    throw new ErroFonte("shopee", "Não foi possível falar com a Shopee agora.");
  }
  if (resposta.errors?.length) throw new ErroFonte("shopee", explicarErro(resposta.errors));
  return extrairOfertasShopee(resposta);
}
