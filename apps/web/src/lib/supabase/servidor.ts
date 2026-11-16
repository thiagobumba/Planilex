import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./config";

/** Cliente do Supabase para páginas, server actions e rotas (lado do servidor). */
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(lista) {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component, que não pode gravar cookies.
          // Sem problema: o proxy.ts renova a sessão a cada requisição.
        }
      },
    },
  });
}
