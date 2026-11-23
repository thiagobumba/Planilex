// Importa um backup do Planilex (JSON) para o banco configurado no .env.
// Uso (na raiz do projeto): npm run db:importar -- caminho/do/backup.json [--sim]
// Cria orçamentos novos; nunca apaga nem altera o que já existe. Documentação: docs/backup.md
import { readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { criarPrisma, importarBackup, lerBackup } from "../dist/index.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(raiz, ".env"), quiet: true });

const args = process.argv.slice(2);
const semPerguntar = args.includes("--sim");
const arquivo = args.find((a) => !a.startsWith("--"));
if (!arquivo) {
  console.error("Diga qual arquivo importar: npm run db:importar -- backups/planilex-AAAA-MM-DD-HHmm.json");
  process.exit(1);
}
const caminho = path.resolve(process.env.INIT_CWD ?? raiz, arquivo);

let backup;
try {
  backup = lerBackup(JSON.parse(readFileSync(caminho, "utf8")));
} catch (e) {
  console.error(e instanceof SyntaxError ? "O arquivo não é um JSON válido." : e.code === "ENOENT" ? `Arquivo não encontrado: ${caminho}` : e.message);
  process.exit(1);
}

const prisma = criarPrisma();
try {
  const itens = backup.orcamentos.reduce((s, o) => s + o.comodos.reduce((t, c) => t + c.itens.length, 0), 0);
  console.log(`Backup de ${new Date(backup.criadoEm).toLocaleString("pt-BR")}: ${backup.orcamentos.length} orçamento(s), ${itens} item(ns).`);
  for (const o of backup.orcamentos) console.log(`  · ${o.nome} — acesso para: ${o.pessoas.map((p) => `${p.email} (${p.papel === "DONO" ? "dono" : "edita"})`).join(", ") || "ninguém"}`);

  const existentes = await prisma.orcamento.count();
  if (existentes > 0 && !semPerguntar) {
    console.log(`\nAtenção: este banco já tem ${existentes} orçamento(s). A importação cria os do backup AO LADO deles (não apaga nada).`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const resposta = (await rl.question("Importar mesmo assim? (s/N) ")).trim().toLowerCase();
    rl.close();
    if (resposta !== "s" && resposta !== "sim") {
      console.log("Nada foi importado.");
      process.exit(0);
    }
  }

  const r = await importarBackup(prisma, backup);
  console.log("\nImportado:");
  for (const o of r.orcamentos) console.log(`  · ${o.nome}: ${o.comodos} cômodo(s), ${o.itens} item(ns), ${o.convites} convite(s)`);
  console.log("\nCada pessoa recupera o acesso ao entrar no Planilex com o mesmo e-mail de antes (Google ou e-mail e senha).");
} catch (e) {
  console.error(`A importação falhou e nada foi gravado: ${e.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
