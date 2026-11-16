import { type NextRequest, NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Só caminhos internos (evita mandar o usuário para outro site). */
function destinoSeguro(proxima: string | null) {
  return proxima && proxima.startsWith("/") && !proxima.startsWith("//") ? proxima : "/";
}

/**
 * O Supabase devolve o usuário para cá depois do Google, da confirmação de e-mail
 * ou do link de nova senha, com um código de uso único (`?code=`) ou com o motivo
 * da falha (`?error=` e `?error_description=`). `?proxima=` diz para onde ir depois.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  let motivo = searchParams.get("error_description") ?? searchParams.get("error");
  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destinoSeguro(searchParams.get("proxima"))}`);
    motivo = error.message;
  }

  motivo ??= "O retorno do login veio sem código.";
  console.error(`[login] falhou: ${motivo}`);
  return NextResponse.redirect(`${origin}/login?erro=${encodeURIComponent(motivo.slice(0, 300))}`);
}
