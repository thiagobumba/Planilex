import { db } from "./db.js";
import { naoEncontrado } from "./erros.js";

/**
 * Garante que o usuário é membro do orçamento.
 * Responde 404 (e não 403) para não revelar que o orçamento existe.
 */
export async function exigirMembro(orcamentoId: string, usuarioId: string) {
  const membro = await db().membroOrcamento.findUnique({
    where: { orcamentoId_usuarioId: { orcamentoId, usuarioId } },
  });
  if (!membro) throw naoEncontrado("Orçamento");
  return membro;
}

/**
 * Busca o cômodo e garante que o usuário é membro do orçamento dele, numa consulta só.
 * Cômodo de outro orçamento responde 404, como se não existisse.
 */
export async function exigirComodo(comodoId: string, usuarioId: string) {
  const comodo = await db().comodo.findFirst({
    where: { id: comodoId, orcamento: { membros: { some: { usuarioId } } } },
  });
  if (!comodo) throw naoEncontrado("Cômodo");
  return comodo;
}

/** Busca o item e garante que o usuário é membro do orçamento dele, numa consulta só. */
export async function exigirItem(itemId: string, usuarioId: string) {
  const item = await db().item.findFirst({
    where: { id: itemId, comodo: { orcamento: { membros: { some: { usuarioId } } } } },
    include: { comodo: true },
  });
  if (!item) throw naoEncontrado("Item");
  return item;
}
