"use client";

import { useState } from "react";
import type { Item, ResumoComodo, Situacao } from "@/lib/tipos";

const fmt = (v?: number | null) => (v == null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/**
 * Campos de item. O "valor pago" só aparece quando a situação é "Comprado"
 * (regra 5: prevenção de erros — não dá para marcar comprado sem informar o valor).
 */
export function CamposItem({
  comodos,
  item,
  comodoPadrao,
}: {
  comodos: Pick<ResumoComodo, "id" | "nome">[];
  item?: Item;
  comodoPadrao?: string;
}) {
  const [situacao, setSituacao] = useState<Situacao>(item?.situacao ?? "PESQUISANDO");
  return (
    <div className="grade-campos">
      <label className="campo campo-largo">
        Item
        <input name="nome" required maxLength={160} placeholder="Ex.: Micro-ondas 30 L inox" defaultValue={item?.nome} />
      </label>
      <label className="campo">
        Cômodo
        <select name="comodoId" required defaultValue={item?.comodoId ?? comodoPadrao ?? comodos[0]?.id}>
          {comodos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        Quantidade
        <input name="quantidade" type="number" min={1} max={9999} defaultValue={item?.quantidade ?? 1} />
      </label>
      <label className="campo">
        Valor previsto (R$)
        <input name="valorPrevisto" inputMode="decimal" placeholder="Ex.: 689,90" defaultValue={fmt(item?.valorPrevisto)} />
        <span className="dica">Total do item, já com a quantidade.</span>
      </label>
      <label className="campo">
        Situação
        <select name="situacao" value={situacao} onChange={(e) => setSituacao(e.target.value as Situacao)}>
          <option value="PESQUISANDO">Pesquisando</option>
          <option value="ESCOLHIDO">Escolhido, ainda vou comprar</option>
          <option value="COMPRADO">Comprado</option>
        </select>
      </label>
      {situacao === "COMPRADO" && (
        <label className="campo">
          Valor pago (R$)
          <input name="valorPago" required inputMode="decimal" placeholder="0,00" defaultValue={fmt(item?.valorPago ?? item?.valorPrevisto)} />
        </label>
      )}
    </div>
  );
}
