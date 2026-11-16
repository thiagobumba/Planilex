import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export type ResultadoEmail = { enviado: true; tipo: "convite" | "link" } | { enviado: false; motivo: string };

const semSessao = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

/** Traduz os erros mais comuns do envio de e-mail do Supabase. */
function explicar(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("not authorized") || m.includes("not_authorized")) {
    return "O serviço de e-mail padrão do Supabase só entrega para membros da equipe do projeto. Configure um SMTP próprio (README › E-mails) para enviar a qualquer endereço.";
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) {
    return "Limite de e-mails por hora do Supabase atingido. Tente reenviar mais tarde.";
  }
  if (m.includes("invalid api key") || m.includes("jwt") || m.includes("not allowed") || m.includes("forbidden")) {
    return "A SUPABASE_SECRET_KEY do .env parece inválida (use uma chave de Project Settings › API Keys › Secret keys).";
  }
  return `O Supabase recusou o envio: ${mensagem}`;
}

/**
 * Envia o e-mail do convite pelo Supabase Auth.
 * - Pessoa sem conta: e-mail "Invite user" (cria a conta; ao clicar, ela entra e define uma senha).
 * - Pessoa que já tem conta: e-mail "Magic link" (ao clicar, ela entra direto).
 * Nos dois casos o link volta para /auth/link, que conclui o login no navegador.
 * O convite vale mesmo se o e-mail não sair: basta a pessoa entrar com esse e-mail.
 */
export async function enviarEmailConvite(email: string): Promise<ResultadoEmail> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return { enviado: false, motivo: "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não estão no .env." };
  }
  if (!env.supabaseSecretKey) {
    return { enviado: false, motivo: "O envio de e-mail não está configurado (falta SUPABASE_SECRET_KEY no .env)." };
  }
  const destino = `${env.origemWeb}/auth/link`;

  try {
    const admin = createClient(env.supabaseUrl, env.supabaseSecretKey, { auth: semSessao });
    const convite = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: destino });
    if (!convite.error) return { enviado: true, tipo: "convite" };

    const jaExiste = convite.error.code === "email_exists" || /already (been )?registered/i.test(convite.error.message);
    if (!jaExiste) return { enviado: false, motivo: explicar(convite.error.message) };

    // Já tem conta: manda um link de acesso. "implicit" porque o pedido sai do servidor (sem navegador para o PKCE).
    const publico = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { ...semSessao, flowType: "implicit" } });
    const link = await publico.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: destino } });
    if (!link.error) return { enviado: true, tipo: "link" };
    return { enviado: false, motivo: explicar(link.error.message) };
  } catch (erro) {
    return { enviado: false, motivo: `Não foi possível falar com o Supabase: ${(erro as Error).message}` };
  }
}
