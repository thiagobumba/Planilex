import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./env.js";
import { rotasSaude } from "./routes/saude.js";

export async function criarApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.origemWeb });
  await app.register(rotasSaude);

  return app;
}
