import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// As variáveis ficam no .env da raiz do repositório.
config({ path: path.resolve(import.meta.dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrações usam a conexão direta (session pooler, porta 5432).
    // O valor vazio permite rodar `prisma generate` sem banco configurado.
    url: process.env.DIRECT_URL ?? "",
  },
});
