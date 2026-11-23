// Backup completo do banco do Planilex em JSON (todos os orçamentos).
// Uso (na raiz do projeto): npm run db:backup            → backups/planilex-AAAA-MM-DD-HHmm.json
//                           npm run db:backup -- arquivo.json
// Documentação: docs/backup.md
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { criarPrisma, exportarBackup, nomeArquivoBackup } from "../dist/index.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(raiz, ".env"), quiet: true });

const pedido = process.argv[2];
const destino = pedido
  ? path.resolve(process.env.INIT_CWD ?? raiz, pedido)
  : path.join(path.resolve(raiz, process.env.BACKUP_PASTA ?? "backups"), nomeArquivoBackup());

const prisma = criarPrisma();
try {
  const backup = await exportarBackup(prisma);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(backup, null, 2));
  const itens = backup.orcamentos.reduce((s, o) => s + o.comodos.reduce((t, c) => t + c.itens.length, 0), 0);
  console.log(`Backup salvo em ${destino}`);
  console.log(`${backup.orcamentos.length} orçamento(s), ${itens} item(ns).`);
  console.log("Guarde uma cópia fora deste computador (Google Drive, pen drive). O arquivo tem os e-mails de quem tem acesso.");
} catch (e) {
  console.error(`Não foi possível fazer o backup: ${e.message}`);
  console.error("Confira a conexão com: npm run db:testar");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
