// Testa as conexões DATABASE_URL e DIRECT_URL e mostra a mensagem exata do servidor.
// Uso: npm run db:testar (na raiz do projeto). A senha nunca é exibida.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(raiz, ".env"), quiet: true });

function semSenha(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(endereço inválido: confira colchetes, aspas e caracteres especiais na senha)";
  }
}

async function testar(nome) {
  const url = process.env[nome];
  console.log(`\n${nome}`);
  if (!url) {
    console.log("  ✗ não está definida no .env");
    return false;
  }
  console.log(`  endereço: ${semSenha(url)}`);
  const cliente = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await cliente.connect();
    const { rows } = await cliente.query("select current_user as usuario, version() as versao");
    console.log(`  ✓ conectou como "${rows[0].usuario}"`);
    return true;
  } catch (erro) {
    console.log(`  ✗ falhou: ${erro.message}${erro.code ? ` (código ${erro.code})` : ""}`);
    return false;
  } finally {
    await cliente.end().catch(() => {});
  }
}

const resultados = [await testar("DATABASE_URL"), await testar("DIRECT_URL")];
console.log(resultados.every(Boolean) ? "\nTudo certo." : "\nHá problemas: veja as mensagens acima.");
process.exit(resultados.every(Boolean) ? 0 : 1);
