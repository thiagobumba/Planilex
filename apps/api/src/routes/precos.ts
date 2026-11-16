import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirLogin } from "../plugins/autenticacao.js";
import { buscarPrecos } from "../precos.js";

const consulta = z.object({
  q: z.string().trim().min(3, "Digite pelo menos 3 letras para buscar preços.").max(120),
  atualizar: z.enum(["1", "true"]).optional(),
});

/** Busca de preços. Documentação: docs/api.md › Busca de preços */
export async function rotasPrecos(app: FastifyInstance) {
  app.addHook("preHandler", exigirLogin);

  app.get("/precos", async (req) => {
    const { q, atualizar } = consulta.parse(req.query);
    return buscarPrecos(q, Boolean(atualizar));
  });
}
