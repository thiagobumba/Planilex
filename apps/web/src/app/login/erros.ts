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
    return "O login começou e terminou em lugares diferentes (outro navegador, outro endereço ou link aberto em outro aparelho). Abra o link no mesmo navegador em que você pediu, usando http://localhost:3000.";
  }
  if (m.includes("redirect") && m.includes("not allowed")) {
    return "O endereço de retorno não está liberado. Em Supabase › Authentication › URL Configuration › Redirect URLs, adicione http://localhost:3000/auth/**.";
  }
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
    return "Essa forma de login não está ativada no Supabase (Authentication › Sign In / Providers).";
  }
  if (m.includes("expired") || m.includes("otp_expired") || m.includes("invalid or has expired")) {
    return "O link expirou ou já foi usado. Peça um novo.";
  }
  return "O login não foi concluído. Tente de novo.";
}

/** Erros do login por e-mail e senha, mostrados no próprio formulário. */
export function explicarErroSenha(motivo: string): string {
  const m = motivo.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme o seu e-mail pelo link que enviamos antes de entrar. Não achou? Olhe no spam.";
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Já existe uma conta com esse e-mail. Use “Entrar” ou “Esqueci a senha”.";
  }
  if (m.includes("password") && (m.includes("at least") || m.includes("characters") || m.includes("weak"))) {
    return "A senha é fraca. Use pelo menos 8 caracteres, misturando letras e números.";
  }
  if (m.includes("same") && m.includes("password")) return "A nova senha precisa ser diferente da atual.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) {
    return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  }
  if (m.includes("invalid") && m.includes("email")) return "Esse e-mail não parece válido.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "A criação de contas por e-mail está desativada no Supabase (Authentication › Sign In / Providers › Email).";
  }
  if (m.includes("email provider") || m.includes("provider is not enabled")) {
    return "O login por e-mail não está ativado no Supabase (Authentication › Sign In / Providers › Email).";
  }
  return `Não foi possível concluir. (${motivo})`;
}
