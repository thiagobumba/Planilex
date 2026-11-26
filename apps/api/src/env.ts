import path from "node:path";
import { config } from "dotenv";

// As variáveis ficam no .env da raiz do repositório.
const raiz = path.resolve(import.meta.dirname, "../../..");
config({ path: path.join(raiz, ".env"), quiet: true });

export const env = {
  porta: Number(process.env.API_PORT ?? 3333),
  databaseUrl: process.env.DATABASE_URL,
  origemWeb: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  /** Chave secreta (só no servidor): usada para enviar o e-mail de convite. Opcional. */
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY?.trim() || undefined,
  /** Chave do SerpApi (busca de preços no Google Shopping). Opcional. */
  serpApiKey: process.env.SERPAPI_KEY?.trim() || undefined,
  /** Endereço do SerpApi; só muda nos testes. */
  serpApiUrl: process.env.SERPAPI_URL ?? "https://serpapi.com",
  /** API de afiliados da Shopee (affiliate.shopee.com.br › Abrir API). Opcionais. */
  shopeeAppId: process.env.SHOPEE_APP_ID?.trim() || undefined,
  shopeeAppSecret: process.env.SHOPEE_APP_SECRET?.trim() || undefined,
  /** Endereço da API de afiliados da Shopee Brasil; só muda nos testes. */
  shopeeApiUrl: process.env.SHOPEE_API_URL ?? "https://open-api.affiliate.shopee.com.br/graphql",
  /** Backup diário automático (docs/backup.md). BACKUP_AUTOMATICO=0 desliga. */
  backupAutomatico: process.env.BACKUP_AUTOMATICO !== "0",
  backupPasta: path.resolve(raiz, process.env.BACKUP_PASTA?.trim() || "backups"),
  backupManter: Math.max(1, Number(process.env.BACKUP_MANTER ?? 30) || 30),
};
