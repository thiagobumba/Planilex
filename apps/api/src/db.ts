import { criarPrisma, type PrismaClient } from "@planilex/db";
import { env } from "./env.js";

let prisma: PrismaClient | undefined;

/** Cliente do banco, criado na primeira vez que for usado. */
export function db(): PrismaClient {
  prisma ??= criarPrisma(env.databaseUrl);
  return prisma;
}
