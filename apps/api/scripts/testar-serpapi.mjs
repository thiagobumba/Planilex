// Confere se a SERPAPI_KEY do .env é aceita pelo SerpApi.
// Usa a Account API, que não gasta buscas da cota. A chave nunca é impressa.
import path from "node:path";
import { existsSync } from "node:fs";

const raiz = path.resolve(import.meta.dirname, "../../..");
const arquivo = path.join(raiz, ".env");
if (!existsSync(arquivo)) {
  console.error("Arquivo .env não encontrado na pasta do projeto.");
  process.exit(1);
}
process.loadEnvFile(arquivo);

const bruta = process.env.SERPAPI_KEY ?? "";
const chave = bruta.trim();
if (!chave) {
  console.error("SERPAPI_KEY está vazia no .env.");
  process.exit(1);
}

const avisos = [];
if (bruta !== chave) avisos.push("tem espaços antes ou depois (já são ignorados)");
if (/["'<>]/.test(chave)) avisos.push("tem aspas ou < > no meio: copie só a chave");
if (/[•*]/.test(chave)) avisos.push("tem • ou *: parece a chave mascarada. Clique no olho para mostrar antes de copiar");
if (!/^[a-f0-9]{64}$/i.test(chave)) avisos.push(`tem ${chave.length} caracteres; a chave do SerpApi costuma ter 64 (letras a-f e números)`);

console.log(`Chave lida do .env: ${chave.slice(0, 4)}…${chave.slice(-4)} (${chave.length} caracteres)`);
for (const a of avisos) console.log(`  Atenção: ${a}`);

const url = new URL("https://serpapi.com/account.json");
url.searchParams.set("api_key", chave);

let corpo;
try {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(15000) });
  corpo = await resposta.json();
} catch (erro) {
  console.error(`Não consegui falar com o serpapi.com: ${erro.message}`);
  process.exit(1);
}

if (corpo.error) {
  console.error(`\nO SerpApi recusou a chave: ${corpo.error}`);
  console.error("Copie de novo a Private API Key em https://serpapi.com/manage-api-key e reinicie a API.");
  process.exit(1);
}

console.log("\nChave válida.");
if (corpo.plan_name) console.log(`  Plano: ${corpo.plan_name}`);
if (corpo.total_searches_left !== undefined) console.log(`  Buscas restantes: ${corpo.total_searches_left}`);
console.log("Se o site ainda mostrar \"chave inválida\", feche e abra a API de novo para ela ler o .env.");
