/** Dados públicos do projeto no Supabase (vêm do .env da raiz). */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Falso enquanto o .env não tiver a URL e a chave pública do Supabase. */
export const supabaseConfigurado =
  /^https?:\/\//.test(supabaseUrl) && supabaseAnonKey.length > 20 && !supabaseAnonKey.includes("[");
