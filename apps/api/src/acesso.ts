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

/** Busca o cômodo e garante que o usuário é membro do orçamento dele. */
export async function exigirComodo(comodoId: string, usuarioId: string) {
  const comodo = await db().comodo.findUnique({ where: { id: comodoId } });
  if (!comodo) throw naoEncontrado("Cômodo");
  await exigirMembro(comodo.orcamentoId, usuarioId);
  return comodo;
}

/** Busca o item e garante que o usuário é membro do orçamento dele. */
export async function exigirItem(itemId: string, usuarioId: string) {
  const item = await db().item.findUnique({ where: { id: itemId }, include: { comodo: true } });
  if (!item) throw naoEncontrado("Item");
  await exigirMembro(item.comodo.orcamentoId, usuarioId);
  return item;
}
