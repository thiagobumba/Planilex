import { exportarBackup, importarBackup, lerBackup, nomeArquivoBackup } from "@planilex/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirMembro } from "../acesso.js";
import { db } from "../db.js";
import { ErroHttp } from "../erros.js";
import { exigirLogin } from "../plugins/autenticacao.js";

const params = z.object({ id: z.uuid() });

/** Backup e importação de um orçamento. Documentação: docs/api.md › Backup e docs/backup.md */
export async function rotasBackup(app: FastifyInstance) {
  app.addHook("preHandler", exigirLogin);

  /** Baixa o backup (JSON) do orçamento. Qualquer pessoa com acesso pode baixar. */
  app.get("/orcamentos/:id/backup", async (req, reply) => {
    const { id } = params.parse(req.params);
    await exigirMembro(id, req.usuario.id);
    const backup = await exportarBackup(db(), [id]);
    return reply.header("content-disposition", `attachment; filename="${nomeArquivoBackup()}"`).send(backup);
  });

  /**
   * Importa um backup como orçamento(s) novo(s). Quem importa vira DONO; as outras pessoas do
   * backup viram convites com o mesmo papel. Nada que já existe é apagado ou alterado.
   */
  app.post("/orcamentos/importar", { bodyLimit: 20 * 1024 * 1024 }, async (req, reply) => {
    let backup;
    try {
      backup = lerBackup(req.body);
    } catch (e) {
      throw new ErroHttp(400, (e as Error).message);
    }
    if (backup.orcamentos.length === 0) throw new ErroHttp(400, "Este backup não tem nenhum orçamento.");
    const resultado = await importarBackup(db(), backup, { usuario: req.usuario });
    return reply.code(201).send(resultado);
  });
}
