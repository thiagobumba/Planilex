"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ErroApi } from "@/lib/api";
import { lerValor } from "@/lib/formato";
import type { EstadoAcao, ResultadoBusca, ResultadoEmailConvite } from "@/lib/tipos";

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

/** Campo oculto "oferta": vazio = não mexe; "null" = remove; JSON = oferta escolhida. */
function lerOferta(f: FormData) {
  const bruto = texto(f, "oferta");
  if (!bruto) return undefined;
  if (bruto === "null") return null;
  try {
    return JSON.parse(bruto) as unknown;
  } catch {
    return undefined;
  }
}

function dadosItem(f: FormData) {
  return {
    oferta: lerOferta(f),
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

/**
 * Botão rápido da lista: marca como comprado (valor pago = valor previsto) ou desmarca
 * (volta para "Escolhido"). Volta para a mesma guia com uma mensagem.
 */
export async function alternarComprado(f: FormData): Promise<void> {
  const id = texto(f, "id");
  const nome = texto(f, "nome");
  const comprar = texto(f, "comprado") === "sim";
  const voltar = texto(f, "voltar") || "/itens";
  const valorPago = lerValor(f.get("valorPrevisto"));
  const separador = voltar.includes("?") ? "&" : "?";
  let destino: string;
  try {
    await api(`/itens/${id}`, {
      method: "PATCH",
      body: comprar ? { situacao: "COMPRADO", valorPago } : { situacao: "ESCOLHIDO" },
    });
    ["/", "/itens", "/comodos"].forEach((c) => revalidatePath(c));
    destino = `${voltar}${separador}${comprar ? "comprado" : "desmarcado"}=${encodeURIComponent(nome)}`;
  } catch (e) {
    if (!(e instanceof ErroApi)) throw e;
    destino = `${voltar}${separador}erro=${encodeURIComponent(e.message)}`;
  }
  redirect(destino);
}

export async function excluirItem(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const id = texto(f, "id");
  const resultado = await tentar(() => api(`/itens/${id}`, { method: "DELETE" }), "Item excluído.");
  if (resultado.erro) return resultado;
  redirect(`/itens?excluido=${encodeURIComponent(texto(f, "nome"))}`);
}

// ---------- Pessoas com acesso ----------

/** Monta a mensagem do convite conforme o e-mail tenha saído ou não. */
function mensagemConvite(email: string, r: ResultadoEmailConvite, reenvio = false): EstadoAcao {
  if (r.emailEnviado) {
    const tipo = r.tipoEmail === "link" ? "um link de acesso (essa pessoa já tem conta)" : "o convite";
    return { ok: `Enviamos ${tipo} para ${email}. Se não aparecer, peça para olhar o spam.`, vez: Date.now() };
  }
  return {
    atencao: `${reenvio ? "O e-mail não foi reenviado" : `Convite para ${email} criado, mas o e-mail não foi enviado`}: ${r.motivoEmail} O convite vale do mesmo jeito: avise a pessoa para entrar no Planilex com esse e-mail.`,
    vez: Date.now(),
  };
}

export async function convidarPessoa(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const orcamentoId = texto(f, "orcamentoId");
  const email = texto(f, "email").toLowerCase();
  let resultado: ResultadoEmailConvite;
  try {
    resultado = await api<ResultadoEmailConvite>(`/orcamentos/${orcamentoId}/convites`, { method: "POST", body: { email } });
  } catch (e) {
    if (e instanceof ErroApi) return { erro: e.message };
    throw e;
  }
  revalidatePath("/configuracoes");
  return mensagemConvite(email, resultado);
}

export async function reenviarConvite(_: EstadoAcao, f: FormData): Promise<EstadoAcao> {
  const id = texto(f, "id");
  const email = texto(f, "email");
  try {
    return mensagemConvite(email, await api<ResultadoEmailConvite>(`/convites/${id}/reenviar`, { method: "POST" }), true);
  } catch (e) {
    if (e instanceof ErroApi) return { erro: e.message };
    throw e;
  }
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

// ---------- Busca de preços ----------

/** Chamada pelo botão "Buscar preços" do formulário de item. */
export async function buscarPrecos(termo: string, atualizar = false): Promise<{ erro?: string; resultado?: ResultadoBusca }> {
  try {
    const q = new URLSearchParams({ q: termo });
    if (atualizar) q.set("atualizar", "1");
    return { resultado: await api<ResultadoBusca>(`/precos?${q}`) };
  } catch (e) {
    if (e instanceof ErroApi) return { erro: e.message };
    throw e;
  }
}
