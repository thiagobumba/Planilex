import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CamposItem } from "@/components/CamposItem";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { api } from "@/lib/api";
import { orcamentoAtual } from "@/lib/dados";
import { NOMES_SITUACAO, reais } from "@/lib/formato";
import type { Item, Situacao } from "@/lib/tipos";
import { criarItem } from "../acoes";

export const metadata: Metadata = { title: "Itens · Planilex" };

const SITUACOES: Situacao[] = ["PESQUISANDO", "ESCOLHIDO", "COMPRADO"];

export default async function Itens({
  searchParams,
}: {
  searchParams: Promise<{ comodo?: string; situacao?: string; busca?: string; salvo?: string; excluido?: string }>;
}) {
  const orcamento = await orcamentoAtual();
  if (!orcamento) redirect("/");
  const p = await searchParams;

  const comodoAtual = orcamento.comodos.find((c) => c.id === p.comodo);
  const situacaoAtual = SITUACOES.find((s) => s === p.situacao);
  const query = new URLSearchParams();
  if (comodoAtual) query.set("comodoId", comodoAtual.id);
  if (situacaoAtual) query.set("situacao", situacaoAtual);
  if (p.busca) query.set("busca", p.busca);
  const itens = await api<Item[]>(`/orcamentos/${orcamento.id}/itens?${query}`);

  const totalPrevisto = itens.reduce((s, i) => s + (i.situacao === "COMPRADO" ? (i.valorPago ?? 0) : (i.valorPrevisto ?? 0)), 0);
  const totalPago = itens.reduce((s, i) => s + (i.valorPago ?? 0), 0);

  /** Monta o link da aba mantendo os outros filtros. */
  const link = (mudancas: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const atual = { comodo: comodoAtual?.id, situacao: situacaoAtual, busca: p.busca, ...mudancas };
    Object.entries(atual).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    return s ? `/itens?${s}` : "/itens";
  };

  return (
    <>
      <nav aria-label="Você está em" className="trilha">
        <Link href="/">Painel</Link> <span aria-hidden="true">›</span> <span>Itens</span>
        {comodoAtual && (
          <>
            {" "}
            <span aria-hidden="true">›</span> <span>{comodoAtual.nome}</span>
          </>
        )}
      </nav>
      <header className="cabecalho">
        <h1>Itens</h1>
      </header>

      {p.salvo && (
        <p role="status" className="aviso aviso-ok">
          “{p.salvo}” foi salvo.
        </p>
      )}
      {p.excluido && (
        <p role="status" className="aviso aviso-ok">
          “{p.excluido}” foi excluído.
        </p>
      )}

      <section className="cartao" id="novo-item" aria-labelledby="novo-titulo">
        <h2 id="novo-titulo">Adicionar item</h2>
        <Formulario acao={criarItem} limparAoSalvar>
          <CamposItem comodos={orcamento.comodos} comodoPadrao={comodoAtual?.id} />
          <div className="acoes">
            <BotaoEnviar carregando="Adicionando…">Adicionar ao orçamento</BotaoEnviar>
          </div>
        </Formulario>
      </section>

      <div className="abas" role="navigation" aria-label="Filtrar por cômodo">
        <Link href={link({ comodo: undefined })} className={!comodoAtual ? "aba ativa" : "aba"} aria-current={!comodoAtual ? "page" : undefined}>
          Todos <span className="contador">{orcamento.resumo.quantidadeItens}</span>
        </Link>
        {orcamento.comodos.map((c) => (
          <Link
            key={c.id}
            href={link({ comodo: c.id })}
            className={comodoAtual?.id === c.id ? "aba ativa" : "aba"}
            aria-current={comodoAtual?.id === c.id ? "page" : undefined}
          >
            {c.nome} <span className="contador">{c.quantidadeItens}</span>
          </Link>
        ))}
      </div>

      <form className="filtros" action="/itens" method="get">
        {comodoAtual && <input type="hidden" name="comodo" value={comodoAtual.id} />}
        <label className="campo campo-linha">
          <span className="visualmente-oculto">Buscar item</span>
          <input type="search" name="busca" placeholder="Buscar item…" defaultValue={p.busca} />
        </label>
        <label className="campo campo-linha">
          Situação
          <select name="situacao" defaultValue={situacaoAtual ?? ""}>
            <option value="">Todas</option>
            {SITUACOES.map((s) => (
              <option key={s} value={s}>
                {NOMES_SITUACAO[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="botao botao-secundario">
          Filtrar
        </button>
      </form>

      <div className="tabela-caixa">
        <table className="tabela">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Cômodo</th>
              <th scope="col">Situação</th>
              <th scope="col" className="num">
                Qtd.
              </th>
              <th scope="col" className="num">
                Previsto
              </th>
              <th scope="col" className="num">
                Pago
              </th>
              <th scope="col">
                <span className="visualmente-oculto">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={7} className="vazio">
                  {p.busca || situacaoAtual ? "Nenhum item com esses filtros." : "Nenhum item ainda. Adicione o primeiro no formulário acima."}
                </td>
              </tr>
            )}
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="forte">
                  {i.nome}
                  {i.ofertaEscolhida && (
                    <a className="oferta-na-tabela" href={i.ofertaEscolhida.link} target="_blank" rel="noopener noreferrer">
                      {i.ofertaEscolhida.loja} · {reais(i.ofertaEscolhida.preco)} ↗
                    </a>
                  )}
                </td>
                <td>{i.comodo}</td>
                <td>
                  <span className={`etiqueta etiqueta-${i.situacao.toLowerCase()}`}>{NOMES_SITUACAO[i.situacao]}</span>
                </td>
                <td className="num">{i.quantidade}</td>
                <td className="num">{reais(i.valorPrevisto)}</td>
                <td className="num">{reais(i.valorPago)}</td>
                <td className="num">
                  <Link href={`/itens/${i.id}`} aria-label={`Editar ${i.nome}`}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tabela-rodape">
          <span>
            {itens.length} {itens.length === 1 ? "item" : "itens"}
          </span>
          <span>
            Previsto <strong>{reais(totalPrevisto)}</strong> · Pago <strong>{reais(totalPago)}</strong>
          </span>
        </div>
      </div>
    </>
  );
}
