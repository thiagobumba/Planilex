import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirLogin } from "../plugins/autenticacao.js";
import { buscarPrecos } from "../precos.js";

const consulta = z.object({
  q: z.string().trim().min(3, "Digite pelo menos 3 letras para buscar preços.").max(120),
  atualizar: z.enum(["1", "true"]).optional(),
  /** Marca para refinar a busca (opcional). */
  marca: z.string().trim().max(60, "A marca pode ter no máximo 60 caracteres.").optional(),
});

/** Busca de preços. Documentação: docs/api.md › Busca de preços */
export async function rotasPrecos(app: FastifyInstance) {
  app.addHook("preHandler", exigirLogin);

  app.get("/precos", async (req) => {
    const { q, atualizar, marca } = consulta.parse(req.query);
    return buscarPrecos(q, Boolean(atualizar), marca);
  });
}
