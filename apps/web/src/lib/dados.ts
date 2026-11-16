import { cache } from "react";
import { api } from "./api";
import { criarClienteServidor } from "./supabase/servidor";
import type { OrcamentoDetalhado } from "./tipos";

/** Orçamento em uso (o primeiro do usuário), já com o resumo: uma chamada só à API. */
export const orcamentoAtual = cache(async (): Promise<OrcamentoDetalhado | null> => {
  return (await api<OrcamentoDetalhado | undefined>("/orcamentos/atual")) ?? null;
});

/**
 * E-mail de quem está logado, só para mostrar no menu. Lê a sessão do cookie, sem ir ao
 * Supabase: o proxy.ts já conferiu o token nesta mesma requisição, e a API confere de novo.
 */
export const usuarioAtual = cache(async () => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { email: "" };
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { email?: string };
    return { email: claims.email ?? "" };
  } catch {
    return { email: "" };
  }
});
