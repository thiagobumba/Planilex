import Link from "next/link";
import { CamposOrcamento } from "@/components/CamposOrcamento";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { orcamentoAtual, usuarioAtual } from "@/lib/dados";
import { reaisInteiros, textoContagem } from "@/lib/formato";
import type { ResumoComodo } from "@/lib/tipos";
import { criarOrcamento } from "./acoes";

export default async function Painel({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const [orcamento, { senha }] = await Promise.all([orcamentoAtual(), searchParams]);
  const avisoSenha = senha === "alterada" && (
    <p role="status" className="aviso aviso-ok">
      Senha alterada. Use a nova senha no próximo login.
    </p>
  );

  if (!orcamento) {
    const { email } = await usuarioAtual();
    return (
      <>
        {avisoSenha}
        <header className="cabecalho">
          <div>
            <h1>Vamos começar</h1>
            <p className="suave">Crie o orçamento. Os cômodos mais comuns já vêm prontos, e você pode mudar depois.</p>
          </div>
        </header>
        <div className="aviso aviso-info">
          <p>
            <strong>O orçamento de vocês já existe?</strong> Não crie outro: peça para quem criou entrar em{" "}
            <strong>Configurações › Pessoas com acesso</strong> e convidar <strong>{email}</strong>. Depois é só recarregar esta página.
          </p>
        </div>
        <Formulario acao={criarOrcamento} className="cartao">
          <CamposOrcamento />
          <div className="acoes">
            <BotaoEnviar carregando="Criando…">Criar orçamento</BotaoEnviar>
          </div>
        </Formulario>
      </>
    );
  }

  const r = orcamento.resumo;
  const pctAPagar = Math.max(0, Math.min(100 - r.percentualPago, r.percentualPrevisto - r.percentualPago));
  const acima = orcamento.comodos.filter((c) => c.acimaDoLimite);
  const contagem = textoContagem(orcamento.dataCasamento);

  return (
    <>
      {avisoSenha}
      <header className="cabecalho">
        <div>
          <h1>Painel</h1>
          {contagem && <p className="suave">{contagem}</p>}
        </div>
        <Link href="/itens#novo-item" className="botao botao-primario">
          + Novo item
        </Link>
      </header>

      <section aria-label="Resumo do orçamento" className="cartoes-resumo">
        <div className="cartao">
          <span className="rotulo">Orçamento total</span>
          <strong className="valor-grande">{reaisInteiros(orcamento.valorTotal)}</strong>
          {orcamento.reservaImprevistos > 0 && (
            <span className="suave">{reaisInteiros(orcamento.reservaImprevistos)} reservados para imprevistos</span>
          )}
        </div>
        <div className="cartao">
          <span className="rotulo">Previsto</span>
          <strong className="valor-grande">{reaisInteiros(r.previsto)}</strong>
          <span className="suave">
            {r.percentualPrevisto}% do orçamento · {r.quantidadeItens} {r.quantidadeItens === 1 ? "item" : "itens"}
          </span>
        </div>
        <div className="cartao">
          <span className="rotulo">Já pago</span>
          <strong className="valor-grande">{reaisInteiros(r.pago)}</strong>
          <span className="suave">
            {r.percentualPago}% · {r.quantidadeComprados} {r.quantidadeComprados === 1 ? "item comprado" : "itens comprados"}
          </span>
        </div>
        <div className={r.disponivel < 0 ? "cartao cartao-alerta" : "cartao cartao-destaque"}>
          <span className="rotulo">{r.disponivel < 0 ? "Acima do orçamento" : "Disponível"}</span>
          <strong className="valor-grande">{reaisInteiros(Math.abs(r.disponivel))}</strong>
          <span>{r.disponivel < 0 ? "o previsto passou do total" : "para itens ainda sem preço"}</span>
        </div>
      </section>

      <section className="cartao" aria-labelledby="uso-titulo">
        <h2 id="uso-titulo">Uso do orçamento</h2>
        <div
          className="barra barra-grande"
          role="img"
          aria-label={`Pago ${r.percentualPago}%, a pagar ${pctAPagar}%, disponível ${Math.max(0, 100 - r.percentualPrevisto)}%`}
        >
          <div className="barra-pago" style={{ width: `${Math.min(100, r.percentualPago)}%` }}></div>
          <div className="barra-apagar" style={{ width: `${pctAPagar}%` }}></div>
        </div>
        <ul className="legenda">
          <li>
            <span className="amostra barra-pago"></span>Pago {reaisInteiros(r.pago)}
          </li>
          <li>
            <span className="amostra barra-apagar"></span>A pagar {reaisInteiros(r.aPagar)}
          </li>
          <li>
            <span className="amostra amostra-livre"></span>Disponível {reaisInteiros(Math.max(0, r.disponivel))}
          </li>
        </ul>
      </section>

      {acima.length > 0 && (
        <section className="aviso aviso-alerta" aria-label="Precisa de atenção">
          {acima.map((c) => (
            <p key={c.id}>
              <strong>{c.nome}</strong> passou do limite em {reaisInteiros(c.excedente)}.{" "}
              <Link href={`/itens?comodo=${c.id}`}>Rever itens</Link>
            </p>
          ))}
        </section>
      )}

      <section aria-labelledby="comodos-titulo">
        <div className="titulo-secao">
          <h2 id="comodos-titulo">Por cômodo</h2>
          <Link href="/comodos">Editar cômodos e limites</Link>
        </div>
        <div className="grade-comodos">
          {orcamento.comodos.map((c) => (
            <CartaoComodo key={c.id} comodo={c} />
          ))}
        </div>
      </section>
    </>
  );
}

function CartaoComodo({ comodo: c }: { comodo: ResumoComodo }) {
  const cor = c.acimaDoLimite ? "barra-acima" : c.percentualDoLimite >= 90 ? "barra-atencao" : "barra-ok";
  return (
    <Link href={`/itens?comodo=${c.id}`} className={c.acimaDoLimite ? "cartao cartao-comodo acima" : "cartao cartao-comodo"}>
      <div className="linha-entre">
        <strong>{c.nome}</strong>
        <span className="suave">
          {c.quantidadeItens} {c.quantidadeItens === 1 ? "item" : "itens"}
        </span>
      </div>
      <div>
        <strong className="valor-medio">{reaisInteiros(c.previsto)}</strong>
        {c.limite > 0 ? <span className="suave"> de {reaisInteiros(c.limite)}</span> : <span className="suave"> · sem limite</span>}
      </div>
      {c.limite > 0 && (
        <div className="barra" role="img" aria-label={`${c.percentualDoLimite}% do limite`}>
          <div className={cor} style={{ width: `${Math.min(100, c.percentualDoLimite)}%` }}></div>
        </div>
      )}
      {c.acimaDoLimite ? (
        <span className="texto-alerta">Acima do limite em {reaisInteiros(c.excedente)}</span>
      ) : (
        <span className="suave">
          {c.limite > 0 ? `${c.percentualDoLimite}% do limite · ` : ""}
          {c.quantidadeComprados} {c.quantidadeComprados === 1 ? "comprado" : "comprados"}
        </span>
      )}
    </Link>
  );
}
