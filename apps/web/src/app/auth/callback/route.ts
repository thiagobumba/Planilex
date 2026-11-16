import { type NextRequest, NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * O Supabase devolve o usuário para cá depois do Google, com um código de uso único
 * (`?code=`) ou com o motivo da falha (`?error=` e `?error_description=`).
 * Em caso de falha, o motivo vai para /login, que mostra uma explicação.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  let motivo = searchParams.get("error_description") ?? searchParams.get("error");
  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
    motivo = error.message;
  }

  motivo ??= "O retorno do login veio sem código.";
  console.error(`[login] falhou: ${motivo}`);
  return NextResponse.redirect(`${origin}/login?erro=${encodeURIComponent(motivo.slice(0, 300))}`);
}
