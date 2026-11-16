import { centavos, num } from "./formatos.js";

type Decimal = { toString(): string };

interface ItemBase {
  situacao: "PESQUISANDO" | "ESCOLHIDO" | "COMPRADO";
  valorPrevisto: Decimal | null;
  valorPago: Decimal | null;
}

/**
 * Quanto um item pesa no orçamento:
 * - comprado com valor pago → o valor pago
 * - nos outros casos → o valor previsto (ou zero, se ainda não tem)
 * Os valores são o total do item (já considerando a quantidade).
 */
export function valorConsiderado(item: ItemBase): number {
  if (item.situacao === "COMPRADO" && item.valorPago != null) return num(item.valorPago)!;
  return num(item.valorPrevisto) ?? 0;
}

export function resumoItens(itens: ItemBase[]) {
  let previsto = 0;
  let pago = 0;
  let comprados = 0;
  for (const item of itens) {
    previsto += valorConsiderado(item);
    pago += num(item.valorPago) ?? 0;
    if (item.situacao === "COMPRADO") comprados++;
  }
  return { previsto: centavos(previsto), pago: centavos(pago), quantidadeItens: itens.length, quantidadeComprados: comprados };
}

/** Percentual inteiro de `parte` sobre `total` (0 quando o total é zero). */
export const percentual = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
