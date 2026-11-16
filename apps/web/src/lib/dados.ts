import { cache } from "react";
import { api } from "./api";
import { criarClienteServidor } from "./supabase/servidor";
import type { Orcamento, OrcamentoDetalhado } from "./tipos";

/** Orçamento em uso: o primeiro do usuário (por enquanto há um por pessoa). */
export const orcamentoAtual = cache(async (): Promise<OrcamentoDetalhado | null> => {
  const lista = await api<Orcamento[]>("/orcamentos");
  if (lista.length === 0) return null;
  return api<OrcamentoDetalhado>(`/orcamentos/${lista[0].id}`);
});

/** E-mail de quem está logado, para mostrar no menu. */
export const usuarioAtual = cache(async () => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  return { email: (data?.claims?.email as string | undefined) ?? "" };
});
