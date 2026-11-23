import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CamposItem } from "@/components/CamposItem";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { api } from "@/lib/api";
import { orcamentoAtual } from "@/lib/dados";
import { NOMES_SITUACAO, reais } from "@/lib/formato";
import type { Item, Situacao } from "@/lib/tipos";
import { alternarComprado, criarItem } from "../acoes";

export const metadata: Metadata = { title: "Itens · Planilex" };

/** Etapas antes da compra (filtro da guia "Falta comprar"). */
const ETAPAS: Situacao[] = ["PESQUISANDO", "CADASTRADO", "ESCOLHIDO"];
type Lista = "falta" | "comprados";

export default async function Itens({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; lista?: string; comodo?: string; situacao?: string; busca?: string; salvo?: string; excluido?: string; comprado?: string; desmarcado?: string; erro?: string }>;
}) {
  const orcamento = await orcamentoAtual();
  if (!orcamento) redirect("/");
  const p = await searchParams;

  const comodoAtual = orcamento.comodos.find((c) => c.id === p.comodo);
  const lista: Lista = p.lista === "comprados" ? "comprados" : "falta";
  // O filtro de situação só existe na guia "Falta comprar".
  const situacaoAtual = lista === "falta" ? ETAPAS.find((s) => s === p.situacao) : undefined;
  const query = new URLSearchParams();
  if (comodoAtual) query.set("comodoId", comodoAtual.id);
  if (p.busca) query.set("busca", p.busca);
  const todos = await api<Item[]>(`/orcamentos/${orcamento.id}/itens?${query}`);

  const faltam = todos.filter((i) => i.situacao !== "COMPRADO");
  const comprados = todos.filter((i) => i.situacao === "COMPRADO");
  const itens = lista === "comprados" ? comprados : faltam.filter((i) => !situacaoAtual || i.situacao === situacaoAtual);

  const totalPrevisto = itens.reduce((s, i) => s + (i.valorPrevisto ?? 0), 0);
  const totalPago = itens.reduce((s, i) => s + (i.valorPago ?? 0), 0);

  /** Monta o link mantendo os outros filtros. */
  const link = (mudancas: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const atual = { lista: lista === "comprados" ? "comprados" : undefined, comodo: comodoAtual?.id, situacao: situacaoAtual, busca: p.busca, ...mudancas };
    Object.entries(atual).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    return s ? `/itens?${s}` : "/itens";
  };

  const voltar = link({});

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
      {p.comprado && (
        <p role="status" className="aviso aviso-ok">
          “{p.comprado}” marcado como comprado. Ele agora está na guia{" "}
          <Link href={link({ lista: "comprados", situacao: undefined })}>Comprados</Link>.
        </p>
      )}
      {p.desmarcado && (
        <p role="status" className="aviso aviso-ok">
          “{p.desmarcado}” voltou para a guia <Link href={link({ lista: undefined })}>Falta comprar</Link>, como “Escolhido”.
        </p>
      )}
      {p.erro && (
        <p role="alert" className="aviso aviso-erro">
          {p.erro}
        </p>
      )}
      {p.excluido && (
        <p role="status" className="aviso aviso-ok">
          “{p.excluido}” foi excluído.
        </p>
      )}

      {/* Fechado por padrão (regra de progressive disclosure): a lista vem primeiro. Abre pelo "+ Novo item" do painel ou quando ainda não há itens. */}
      <details className="cartao novo-item" id="novo-item" open={p.novo === "1" || orcamento.resumo.quantidadeItens === 0}>
        <summary>
          <span className="novo-item-abrir botao botao-primario">+ Novo item</span>
          <span className="novo-item-titulo">Adicionar item</span>
          <span className="novo-item-fechar botao-link">Fechar</span>
        </summary>
        <Formulario acao={criarItem} limparAoSalvar>
          <CamposItem comodos={orcamento.comodos} comodoPadrao={comodoAtual?.id} />
          <div className="acoes">
            <BotaoEnviar carregando="Adicionando…">Adicionar ao orçamento</BotaoEnviar>
          </div>
        </Formulario>
      </details>

      <nav className="guias" aria-label="Listas de compra">
        <Link href={link({ lista: undefined })} className={lista === "falta" ? "guia ativa" : "guia"} aria-current={lista === "falta" ? "page" : undefined}>
          Falta comprar <span className="contador">{faltam.length}</span>
        </Link>
        <Link
          href={link({ lista: "comprados", situacao: undefined })}
          className={lista === "comprados" ? "guia ativa" : "guia"}
          aria-current={lista === "comprados" ? "page" : undefined}
        >
          Comprados <span className="contador">{comprados.length}</span>
        </Link>
      </nav>

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
        {lista === "comprados" && <input type="hidden" name="lista" value="comprados" />}
        {comodoAtual && <input type="hidden" name="comodo" value={comodoAtual.id} />}
        <label className="campo campo-linha">
          <span className="visualmente-oculto">Buscar item</span>
          <input type="search" name="busca" placeholder="Buscar item…" defaultValue={p.busca} />
        </label>
        {lista === "falta" && (
          <label className="campo campo-linha">
            Situação
            <select name="situacao" defaultValue={situacaoAtual ?? ""}>
              <option value="">Todas</option>
              {ETAPAS.map((s) => (
                <option key={s} value={s}>
                  {NOMES_SITUACAO[s]}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="botao botao-secundario">
          Filtrar
        </button>
      </form>

      <div className="tabela-caixa">
        <table className="tabela tabela-itens">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Cômodo</th>
              {lista === "falta" && <th scope="col">Situação</th>}
              <th scope="col" className="num">
                Qtd.
              </th>
              <th scope="col" className="num">
                Previsto
              </th>
              {lista === "comprados" && (
                <th scope="col" className="num">
                  Pago
                </th>
              )}
              <th scope="col">Comprado?</th>
              <th scope="col">
                <span className="visualmente-oculto">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={7} className="vazio">
                  {p.busca || situacaoAtual || comodoAtual
                    ? "Nenhum item com esses filtros."
                    : lista === "comprados"
                      ? "Nenhum item comprado ainda. Marque “Comprado? Sim” num item da guia Falta comprar."
                      : todos.length > 0
                        ? "Tudo comprado! Nada falta na lista."
                        : "Nenhum item ainda. Adicione o primeiro em “+ Novo item”."}
                </td>
              </tr>
            )}
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="forte c-nome">
                  {i.nome}
                  {i.ofertaEscolhida && (
                    <a className="oferta-na-tabela" href={i.ofertaEscolhida.link} target="_blank" rel="noopener noreferrer">
                      {i.ofertaEscolhida.loja} · {reais(i.ofertaEscolhida.preco)} ↗
                    </a>
                  )}
                </td>
                <td className="c-comodo">{i.comodo}</td>
                {lista === "falta" && (
                  <td className="c-situacao">
                    <span className={`etiqueta etiqueta-${i.situacao.toLowerCase()}`}>{NOMES_SITUACAO[i.situacao]}</span>
                  </td>
                )}
                <td className="num c-qtd" data-rotulo="Qtd.">
                  {i.quantidade}
                </td>
                <td className="num c-previsto" data-rotulo="Previsto">
                  {reais(i.valorPrevisto)}
                </td>
                {lista === "comprados" && (
                  <td className="num c-pago" data-rotulo="Pago">
                    {reais(i.valorPago)}
                  </td>
                )}
                <td className="c-acao">
                  {lista === "falta" && i.valorPrevisto == null ? (
                    <Link href={`/itens/${i.id}`} className="botao botao-secundario botao-pequeno" title="Informe o valor pago para marcar como comprado">
                      Marcar comprado
                    </Link>
                  ) : (
                    <form action={alternarComprado} className="form-comprado">
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="nome" value={i.nome} />
                      <input type="hidden" name="voltar" value={voltar} />
                      <input type="hidden" name="valorPrevisto" value={i.valorPrevisto ?? ""} />
                      <input type="hidden" name="comprado" value={lista === "falta" ? "sim" : "nao"} />
                      <button
                        type="submit"
                        className={lista === "falta" ? "botao botao-secundario botao-pequeno" : "botao botao-primario botao-pequeno"}
                        aria-label={lista === "falta" ? `Marcar ${i.nome} como comprado` : `Desmarcar ${i.nome} como comprado`}
                        title={lista === "falta" ? "Marca como comprado usando o valor previsto como valor pago" : "Volta o item para Falta comprar"}
                      >
                        {lista === "falta" ? "Marcar comprado" : "Desmarcar"}
                      </button>
                    </form>
                  )}
                </td>
                <td className="num c-editar">
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
          {lista === "falta" ? (
            <span>
              Falta comprar <strong>{reais(totalPrevisto)}</strong> (previsto)
            </span>
          ) : (
            <span>
              Previsto <strong>{reais(totalPrevisto)}</strong> · Pago <strong>{reais(totalPago)}</strong>
            </span>
          )}
        </div>
      </div>
    </>
  );
}
