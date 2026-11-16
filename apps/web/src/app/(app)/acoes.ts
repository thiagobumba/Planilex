"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ErroApi } from "@/lib/api";
import { lerValor } from "@/lib/formato";
import type { EstadoAcao } from "@/lib/tipos";

/** Executa a chamada; erro da API vira mensagem no formulário. Redirecionamentos passam adiante. */
async function tentar(fn: () => Promise<unknown>, ok: string, caminhos: string[] = ["/", "/itens", "/comodos"]): Promise<EstadoAcao> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof ErroApi) return { erro: e.message };
    throw e;
  }
  caminhos.forEach((c) => revalidatePath(c));
  return { ok, vez: Date.now() };
}

function valorOuErro(campo: string, texto: FormDataEntryValue | null): number | null {
  const v = lerValor(texto);
  if (Number.isNaN(v)) throw new ErroApi(400, `"${campo}" não é um valor válido. Use, por exemplo, 1.234,56.`);
  return v;
}

const texto = (f: FormData, campo: string) => String(f.get(campo) ?? "").trim();

// ---------- Orçamento ----------

function dadosOrcamento(f: FormData) {
  return {
    nome: texto(f, "nome"),
    valorTotal: valorOuErro("Orçamento total", f.get("valorTotal")) ?? 0,
    reservaImprevistos: valorOuErro("Reserva para imprevistos", f.get("reservaImprevistos")) ?? 0,
    dataCasamento: texto(f, "dataCasamento") || null,
    voltagemCasa: texto(f, "voltagemCasa") || undefined,
    cep: texto(f, "cep") || null,
  };
}

export async function criarOrcamento(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  return tentar(() => api("/orcamentos", { method: "POST", body: { ...dadosOrcamento(f), comodosPadrao: true } }), "Orçamento criado.");
}

export async function editarOrcamento(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const id = texto(f, "id");
  return tentar(() => api(`/orcamentos/${id}`, { method: "PATCH", body: dadosOrcamento(f) }), "Alterações salvas.");
}

// ---------- Cômodos ----------

export async function criarComodo(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const orcamentoId = texto(f, "orcamentoId");
  const nome = texto(f, "nome");
  return tentar(
    () => api(`/orcamentos/${orcamentoId}/comodos`, { method: "POST", body: { nome, limite: valorOuErro("Limite", f.get("limite")) ?? 0 } }),
    `Cômodo "${nome}" criado.`,
  );
}

export async function editarComodo(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const id = texto(f, "id");
  return tentar(
    () => api(`/comodos/${id}`, { method: "PATCH", body: { nome: texto(f, "nome"), limite: valorOuErro("Limite", f.get("limite")) ?? 0 } }),
    "Salvo.",
  );
}

export async function excluirComodo(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const id = texto(f, "id");
  return tentar(() => api(`/comodos/${id}`, { method: "DELETE" }), "Cômodo excluído.");
}

// ---------- Itens ----------

function dadosItem(f: FormData) {
  return {
    nome: texto(f, "nome"),
    comodoId: texto(f, "comodoId"),
    quantidade: Number(texto(f, "quantidade") || 1),
    situacao: texto(f, "situacao") || "PESQUISANDO",
    valorPrevisto: valorOuErro("Valor previsto", f.get("valorPrevisto")),
    valorPago: valorOuErro("Valor pago", f.get("valorPago")),
  };
}

export async function criarItem(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const nome = texto(f, "nome");
  return tentar(() => api("/itens", { method: "POST", body: dadosItem(f) }), `"${nome}" adicionado.`);
}

export async function editarItem(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const id = texto(f, "id");
  const resultado = await tentar(() => api(`/itens/${id}`, { method: "PATCH", body: dadosItem(f) }), "Item salvo.");
  if (resultado.erro) return resultado;
  redirect(`/itens?salvo=${encodeURIComponent(texto(f, "nome"))}`);
}

export async function excluirItem(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const id = texto(f, "id");
  const resultado = await tentar(() => api(`/itens/${id}`, { method: "DELETE" }), "Item excluído.");
  if (resultado.erro) return resultado;
  redirect(`/itens?excluido=${encodeURIComponent(texto(f, "nome"))}`);
}

// ---------- Pessoas com acesso ----------

export async function convidarPessoa(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const orcamentoId = texto(f, "orcamentoId");
  const email = texto(f, "email").toLowerCase();
  return tentar(
    () => api(`/orcamentos/${orcamentoId}/convites`, { method: "POST", body: { email } }),
    `Convite criado. Quando ${email} entrar no Planilex (com Google ou e-mail e senha), vai ver este orçamento.`,
    ["/configuracoes"],
  );
}

export async function cancelarConvite(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const id = texto(f, "id");
  return tentar(() => api(`/convites/${id}`, { method: "DELETE" }), `Convite para ${texto(f, "email")} cancelado.`, ["/configuracoes"]);
}

export async function removerPessoa(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const orcamentoId = texto(f, "orcamentoId");
  const usuarioId = texto(f, "usuarioId");
  return tentar(
    () => api(`/orcamentos/${orcamentoId}/membros/${usuarioId}`, { method: "DELETE" }),
    `${texto(f, "email") || "A pessoa"} não tem mais acesso.`,
    ["/configuracoes"],
  );
}
