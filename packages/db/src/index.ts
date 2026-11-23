import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export * from "./generated/prisma/client.js";

/**
 * Cria o cliente do banco usando a conexão com pooler (DATABASE_URL, porta 6543).
 */
export function criarPrisma(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida. Copie .env.example para .env e preencha.");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export * from "./backup.js";
