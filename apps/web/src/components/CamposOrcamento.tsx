import type { Orcamento } from "@/lib/tipos";

const fmt = (v?: number) => (v == null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** Campos usados para criar e para editar o orçamento. */
export function CamposOrcamento({ orcamento }: { orcamento?: Orcamento }) {
  return (
    <div className="grade-campos">
      <label className="campo campo-largo">
        Nome do orçamento
        <input name="nome" required maxLength={120} defaultValue={orcamento?.nome ?? "Nossa casa"} />
      </label>
      <label className="campo">
        Orçamento total (R$)
        <input name="valorTotal" required inputMode="decimal" placeholder="Ex.: 60.000,00" defaultValue={fmt(orcamento?.valorTotal)} />
        <span className="dica">Tudo o que vocês podem gastar com a casa.</span>
      </label>
      <label className="campo">
        Reserva para imprevistos (R$)
        <input name="reservaImprevistos" inputMode="decimal" placeholder="Ex.: 6.000,00" defaultValue={fmt(orcamento?.reservaImprevistos)} />
        <span className="dica">Parte do total que fica guardada.</span>
      </label>
      <label className="campo">
        Data do casamento
        <input name="dataCasamento" type="date" defaultValue={orcamento?.dataCasamento ?? ""} />
      </label>
      <label className="campo">
        Voltagem da casa
        <select name="voltagemCasa" defaultValue={orcamento?.voltagemCasa ?? "V220"}>
          <option value="V127">127 V</option>
          <option value="V220">220 V</option>
          <option value="BIVOLT">Tomadas das duas voltagens</option>
        </select>
        <span className="dica">Usada para filtrar ofertas de eletrodomésticos.</span>
      </label>
      <label className="campo">
        CEP (opcional)
        <input name="cep" inputMode="numeric" maxLength={9} placeholder="Ex.: 01310-100" defaultValue={orcamento?.cep ?? ""} />
        <span className="dica">Para calcular frete na busca de preços.</span>
      </label>
    </div>
  );
}
