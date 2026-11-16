import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { env } from "../env.js";

/** Rotas para conferir se a API e o banco estão no ar. Documentação: docs/api.md */
export async function rotasSaude(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/health/banco", async (_req, reply) => {
    if (!env.databaseUrl) {
      return reply.code(503).send({ status: "erro", mensagem: "DATABASE_URL não configurada no .env" });
    }
    try {
      await db().$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch (erro) {
      app.log.error(erro);
      return reply.code(503).send({ status: "erro", mensagem: "Não foi possível conectar ao banco" });
    }
  });
}
