/**
 * Traduz o motivo técnico de uma falha de login em uma orientação.
 * Os textos técnicos vêm do Supabase/Google (em inglês).
 */
export function explicarErroLogin(motivo: string): string {
  const m = motivo.toLowerCase();
  if (m.includes("exchange external code") || m.includes("invalid_client") || m.includes("unauthorized_client")) {
    return "O Supabase não conseguiu falar com o Google. Confira se o ID do cliente e a chave secreta em Supabase › Authentication › Sign In / Providers › Google são os mesmos do Google Cloud (se a chave foi trocada, cole a nova).";
  }
  if (m.includes("access_denied") || m.includes("access denied")) {
    return "O Google não liberou o acesso. Confira se o seu e-mail está em Google Auth Platform › Público-alvo › Usuários de teste.";
  }
  if (m.includes("code verifier") || m.includes("code_verifier") || m.includes("pkce") || m.includes("flow state")) {
    return "O login começou e terminou em endereços diferentes. Use sempre http://localhost:3000 (não 127.0.0.1) e tente de novo.";
  }
  if (m.includes("redirect") && m.includes("not allowed")) {
    return "O endereço de retorno não está liberado. Adicione http://localhost:3000/auth/callback em Supabase › Authentication › URL Configuration › Redirect URLs.";
  }
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
    return "O login com Google não está ativado no Supabase (Authentication › Sign In / Providers › Google).";
  }
  return "O login não foi concluído. Tente de novo.";
}
