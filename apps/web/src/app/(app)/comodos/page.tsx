import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { orcamentoAtual } from "@/lib/dados";
import { reaisInteiros } from "@/lib/formato";
import { criarComodo, editarComodo, excluirComodo } from "../acoes";

export const metadata: Metadata = { title: "Cômodos · Planilex" };

const fmt = (v: number) => (v ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

export default async function Comodos() {
  const orcamento = await orcamentoAtual();
  if (!orcamento) redirect("/");
  const somaLimites = orcamento.comodos.reduce((s, c) => s + c.limite, 0);
  const semLimite = orcamento.valorTotal - orcamento.reservaImprevistos - somaLimites;

  return (
    <>
      <nav aria-label="Você está em" className="trilha">
        <Link href="/">Painel</Link> <span aria-hidden="true">›</span> <span>Cômodos</span>
      </nav>
      <header className="cabecalho">
        <div>
          <h1>Cômodos e limites</h1>
          <p className="suave">
            Limites somados: {reaisInteiros(somaLimites)} de {reaisInteiros(orcamento.valorTotal - orcamento.reservaImprevistos)} (total menos a
            reserva).{" "}
            {semLimite >= 0 ? `Sobram ${reaisInteiros(semLimite)} sem cômodo definido.` : `Os limites passam do total em ${reaisInteiros(-semLimite)}.`}
          </p>
        </div>
      </header>

      <ul className="lista-comodos">
        {orcamento.comodos.map((c) => (
          <li key={c.id} className="cartao">
            <Formulario acao={editarComodo} className="linha-comodo">
              <input type="hidden" name="id" value={c.id} />
              <label className="campo">
                Nome
                <input name="nome" required maxLength={80} defaultValue={c.nome} />
              </label>
              <label className="campo">
                Limite (R$)
                <input name="limite" inputMode="decimal" placeholder="Sem limite" defaultValue={fmt(c.limite)} />
              </label>
              <span className="suave">
                {c.quantidadeItens} {c.quantidadeItens === 1 ? "item" : "itens"} · previsto {reaisInteiros(c.previsto)}
              </span>
              <BotaoEnviar variante="secundario">Salvar</BotaoEnviar>
            </Formulario>
            {c.quantidadeItens === 0 && (
              <Formulario acao={excluirComodo} className="linha-excluir">
                <input type="hidden" name="id" value={c.id} />
                <BotaoEnviar variante="perigo" carregando="Excluindo…">
                  Excluir “{c.nome}”
                </BotaoEnviar>
              </Formulario>
            )}
          </li>
        ))}
      </ul>

      <section className="cartao" aria-labelledby="novo-comodo">
        <h2 id="novo-comodo">Novo cômodo</h2>
        <Formulario acao={criarComodo} className="linha-comodo" limparAoSalvar>
          <input type="hidden" name="orcamentoId" value={orcamento.id} />
          <label className="campo">
            Nome
            <input name="nome" required maxLength={80} placeholder="Ex.: Varanda" />
          </label>
          <label className="campo">
            Limite (R$)
            <input name="limite" inputMode="decimal" placeholder="Sem limite" />
          </label>
          <BotaoEnviar carregando="Criando…">Adicionar cômodo</BotaoEnviar>
        </Formulario>
      </section>
      <p className="suave">Só é possível excluir cômodos sem itens, para nenhum item ser perdido sem querer.</p>
    </>
  );
}
