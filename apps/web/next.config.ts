import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// As variáveis ficam no .env da raiz do repositório (../../.env).
// O Next já leu o .env de apps/web antes deste arquivo e guarda o resultado em
// memória; sem forceReload (4º argumento) a leitura da raiz seria ignorada.
const raiz = path.resolve(process.cwd(), "../..");
const { combinedEnv } = loadEnvConfig(raiz, process.env.NODE_ENV !== "production", undefined, true);

// Garante que as variáveis públicas cheguem ao código do navegador.
const publicas = Object.fromEntries(
  Object.entries(combinedEnv).filter(([chave, valor]) => chave.startsWith("NEXT_PUBLIC_") && valor !== undefined),
) as Record<string, string>;

const nextConfig: NextConfig = {
  env: publicas,
};

export default nextConfig;
