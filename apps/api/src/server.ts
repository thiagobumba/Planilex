import { criarApp } from "./app.js";
import { env } from "./env.js";

const app = await criarApp();

try {
  await app.listen({ port: env.porta, host: "0.0.0.0" });
} catch (erro) {
  app.log.error(erro);
  process.exit(1);
}
