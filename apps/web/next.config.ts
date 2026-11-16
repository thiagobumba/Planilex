import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// As variáveis ficam no .env da raiz do repositório.
loadEnvConfig(path.resolve(process.cwd(), "../.."));

const nextConfig: NextConfig = {};

export default nextConfig;
