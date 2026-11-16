import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAnonKey, supabaseConfigurado, supabaseUrl } from "./lib/supabase/config";

const ROTAS_PUBLICAS = ["/login", "/auth"];

/**
 * Roda antes de cada página: renova a sessão do Supabase (cookies) e
 * manda para /login quem não está logado.
 */
export async function proxy(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.some((r) => caminho === r || caminho.startsWith(`${r}/`));

  if (!supabaseConfigurado) {
    return publica ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista, cabecalhos) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cabecalhos ?? {}).forEach(([chave, valor]) => response.headers.set(chave, valor));
      },
    },
  });

  // getClaims confere a assinatura do token (não confia só no cookie).
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);

  if (!logado && !publica) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (logado && caminho === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
