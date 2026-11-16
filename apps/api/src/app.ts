import cors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import { ZodError } from "zod";
import { env } from "./env.js";
import { ErroHttp } from "./erros.js";
import { rotasComodos } from "./routes/comodos.js";
import { rotasItens } from "./routes/itens.js";
import { rotasOrcamentos } from "./routes/orcamentos.js";
import { rotasPessoas } from "./routes/pessoas.js";
import { rotasPrecos } from "./routes/precos.js";
import { rotasSaude } from "./routes/saude.js";

export async function criarApp(opcoes: FastifyServerOptions = { logger: true }) {
  const app = Fastify(opcoes);

  await app.register(cors, { origin: env.origemWeb, methods: ["GET", "POST", "PATCH", "DELETE"] });

  // Respostas de erro sempre no formato { erro: "mensagem" }.
  app.setErrorHandler((erro, req, reply) => {
    if (erro instanceof ZodError) {
      const primeiro = erro.issues[0];
      return reply.code(400).send({ erro: primeiro?.message ?? "Dados inválidos.", campo: primeiro?.path.join(".") });
    }
    if (erro instanceof ErroHttp) {
      return reply.code(erro.status).send({ erro: erro.message });
    }
    const status = (erro as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply.code(status).send({ erro: (erro as Error).message });
    }
    req.log.error(erro);
    // Em desenvolvimento, o motivo vai junto para aparecer no site e facilitar o diagnóstico.
    const detalhe = process.env.NODE_ENV === "production" ? "" : ` Detalhe: ${(erro as Error).message?.trim().split("\n").filter(Boolean).slice(-2).join(" ")}`;
    return reply.code(500).send({ erro: `Erro inesperado no servidor.${detalhe}` });
  });

  await app.register(rotasSaude);
  await app.register(rotasOrcamentos);
  await app.register(rotasComodos);
  await app.register(rotasItens);
  await app.register(rotasPessoas);
  await app.register(rotasPrecos);

  return app;
}
