import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { exportarBackup, nomeArquivoBackup } from "@planilex/db";
import type { FastifyBaseLogger } from "fastify";
import { db } from "./db.js";
import { env } from "./env.js";

const DIA_MS = 24 * 60 * 60 * 1000;
const PADRAO = /^planilex-\d{4}-\d{2}-\d{2}-\d{4}\.json$/;

/** Backups da pasta, do mais novo para o mais antigo. */
function listar(pasta: string) {
  try {
    return readdirSync(pasta)
      .filter((f) => PADRAO.test(f))
      .map((f) => ({ arquivo: path.join(pasta, f), quando: statSync(path.join(pasta, f)).mtimeMs }))
      .sort((a, b) => b.quando - a.quando);
  } catch {
    return [];
  }
}

/** Faz o backup se o último tem mais de 24 h e apaga os antigos além de `backupManter`. */
export async function backupSeNecessario(log: FastifyBaseLogger) {
  const pasta = env.backupPasta;
  const existentes = listar(pasta);
  if (existentes[0] && Date.now() - existentes[0].quando < DIA_MS) return;
  try {
    const backup = await exportarBackup(db());
    mkdirSync(pasta, { recursive: true });
    const destino = path.join(pasta, nomeArquivoBackup());
    writeFileSync(destino, JSON.stringify(backup, null, 2));
    log.info({ arquivo: destino, orcamentos: backup.orcamentos.length }, "Backup automático salvo");
    for (const velho of listar(pasta).slice(env.backupManter)) unlinkSync(velho.arquivo);
  } catch (e) {
    log.error({ err: e }, "Backup automático falhou (tento de novo em 1 hora)");
  }
}

/** Liga o backup diário enquanto a API estiver rodando: confere ao subir e depois a cada hora. */
export function iniciarBackupAutomatico(log: FastifyBaseLogger) {
  if (!env.backupAutomatico) return;
  setTimeout(() => void backupSeNecessario(log), 30_000).unref();
  setInterval(() => void backupSeNecessario(log), 60 * 60 * 1000).unref();
}
