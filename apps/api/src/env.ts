import path from "node:path";
import { config } from "dotenv";

// As variáveis ficam no .env da raiz do repositório.
config({ path: path.resolve(import.meta.dirname, "../../../.env"), quiet: true });

export const env = {
  porta: Number(process.env.API_PORT ?? 3333),
  databaseUrl: process.env.DATABASE_URL,
  origemWeb: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  /** Chave secreta (só no servidor): usada para enviar o e-mail de convite. Opcional. */
  /** Chave do SerpApi (busca de preços no Google Shopping). Opcional. */
  serpApiKey: process.env.SERPAPI_KEY?.trim() || undefined,
  /** Endereço do SerpApi; só muda nos testes. */
  serpApiUrl: process.env.SERPAPI_URL ?? "https://serpapi.com",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY?.trim() || undefined,
};
