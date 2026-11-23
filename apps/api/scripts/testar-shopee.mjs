// Confere se SHOPEE_APP_ID e SHOPEE_APP_SECRET do .env são aceitos pela API de afiliados da Shopee.
// Faz uma busca de teste ("micro-ondas", 3 produtos). O segredo nunca é impresso.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

const arquivo = path.resolve(import.meta.dirname, "../../../.env");
if (!existsSync(arquivo)) {
  console.error("Arquivo .env não encontrado na pasta do projeto.");
  process.exit(1);
}
process.loadEnvFile(arquivo);

const appId = (process.env.SHOPEE_APP_ID ?? "").trim();
const segredo = (process.env.SHOPEE_APP_SECRET ?? "").trim();
const url = process.env.SHOPEE_API_URL ?? "https://open-api.affiliate.shopee.com.br/graphql";
if (!appId || !segredo) {
  console.error("Preencha SHOPEE_APP_ID e SHOPEE_APP_SECRET no .env (affiliate.shopee.com.br › Abrir API).");
  process.exit(1);
}
if (!/^\d+$/.test(appId)) console.log("  Atenção: o AppID da Shopee costuma ter só números.");
if (/["'\s]/.test(segredo)) console.log("  Atenção: o segredo tem aspas ou espaços: copie só o código.");
console.log(`AppID: ${appId} · segredo com ${segredo.length} caracteres`);

const corpo = JSON.stringify({
  query: `query { productOfferV2(keyword: "micro-ondas", sortType: 1, page: 1, limit: 3) { nodes { productName priceMin shopName } } }`,
});
const ts = Math.floor(Date.now() / 1000);
const assinatura = createHash("sha256").update(`${appId}${ts}${corpo}${segredo}`).digest("hex");

let resposta;
try {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${assinatura}` },
    body: corpo,
    signal: AbortSignal.timeout(20000),
  });
  resposta = await r.json();
} catch (erro) {
  console.error(`Não consegui falar com a Shopee: ${erro.message}`);
  process.exit(1);
}

if (resposta.errors?.length) {
  console.error("\nA Shopee recusou a busca:");
  for (const e of resposta.errors) console.error(`  ${e.extensions?.code ?? ""} ${e.extensions?.message ?? e.message ?? ""}`);
  console.error("Confira o AppID e a Senha em affiliate.shopee.com.br › Abrir API e reinicie a API depois de corrigir.");
  process.exit(1);
}
const nodes = resposta.data?.productOfferV2?.nodes ?? [];
console.log(`\nChaves aceitas. Busca de teste "micro-ondas": ${nodes.length} produto(s).`);
for (const n of nodes) console.log(`  R$ ${n.priceMin} · ${n.productName} · ${n.shopName}`);
console.log("Se o site ainda não mostrar ofertas da Shopee, feche e abra a API de novo para ela ler o .env.");
