import path from "node:path";
import { config } from "dotenv";

// As variáveis ficam no .env da raiz do repositório.
config({ path: path.resolve(import.meta.dirname, "../../../.env") });

export const env = {
  porta: Number(process.env.API_PORT ?? 3333),
  databaseUrl: process.env.DATABASE_URL,
  origemWeb: process.env.WEB_ORIGIN ?? "http://localhost:3000",
};
