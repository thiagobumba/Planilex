import Link from "next/link";
import { CamposOrcamento } from "@/components/CamposOrcamento";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { orcamentoAtual, usuarioAtual } from "@/lib/dados";
import { reaisInteiros, textoContagem } from "@/lib/formato";
import type { ResumoComodo } from "@/lib/tipos";
import { criarOrcamento, importarBackup } from "./acoes";

export default async function Painel({ searchParams }: { searchParams: Promise<{ senha?: string; importado?: string }> }) {
  const [orcamento, { senha, importado }] = await Promise.all([orcamentoAtual(), searchParams]);
  const avisoSenha = (
    <>
      {senha === "alterada" && (
        <p role="status" className="aviso aviso-ok">
          Senha alterada. Use a nova senha no próximo login.
        </p>
      )}
      {importado === "1" && (
        <p role="status" className="aviso aviso-ok">
          Backup importado. As outras pessoas do orçamento recuperam o acesso quando entrarem com o mesmo e-mail de antes.
        </p>
      )}
    </>
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
        <section className="cartao" aria-labelledby="importar-titulo">
          <div>
            <h2 id="importar-titulo">Tem um backup?</h2>
            <p className="suave">
              Numa instalação nova, traga tudo de volta: cômodos, itens, ofertas e histórico de preços. Você vira dono do orçamento importado, e as
              outras pessoas recuperam o acesso ao entrar com o mesmo e-mail.
            </p>
          </div>
          <Formulario acao={importarBackup}>
            <div className="campo">
              <label htmlFor="arquivo-backup">Arquivo do backup (.json)</label>
              <input id="arquivo-backup" name="arquivo" type="file" accept="application/json,.json" required />
            </div>
            <div className="acoes">
              <BotaoEnviar variante="secundario" carregando="Importando…">
                Importar backup
              </BotaoEnviar>
            </div>
          </Formulario>
        </section>
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
          <span className="prancha">Prancha 01 · orçamento por cômodo</span>
          <h1>{orcamento.nome}</h1>
          {contagem && <p className="suave">{contagem}</p>}
        </div>
        <Link href="/itens?novo=1#novo-item" className="botao botao-primario">
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
        <Planta comodos={orcamento.comodos} />
        <ul className="legenda legenda-planta">
          <li>
            <span className="amostra amostra-ocupado"></span>Altura da cor: quanto do limite já está previsto
          </li>
          <li>
            <span className="amostra amostra-hachura"></span>Hachura: acima do limite
          </li>
        </ul>
      </section>
    </>
  );
}

/**
 * Cômodos desenhados como a planta da casa. Cada cômodo ocupa uma área proporcional ao seu peso
 * no orçamento (o maior entre limite e previsto); a cor sobe conforme o limite é usado e vira
 * hachura quando passa dele. Cada cômodo leva aos itens dele.
 */
function Planta({ comodos }: { comodos: ResumoComodo[] }) {
  const pesos = comodos.map((c) => Math.max(c.limite, c.previsto, 1));
  const total = pesos.reduce((s, p) => s + p, 0) || 1;
  // Os maiores primeiro, para a planta fechar melhor (grid-auto-flow: dense completa os vãos).
  const ordem = comodos.map((c, i) => ({ c, fatia: pesos[i] / total })).sort((a, b) => b.fatia - a.fatia);
  return (
    <div className="planta" role="list" aria-label="Planta da casa: gasto previsto por cômodo">
      {ordem.map(({ c, fatia }) => {
        const grande = fatia >= 0.22;
        const colunas = Math.max(3, Math.min(grande ? 6 : 4, Math.round(fatia * 24)));
        const ocupacao = c.limite > 0 ? Math.min(100, c.percentualDoLimite) : 0;
        const estilo = {
          "--colunas": colunas,
          "--linhas": grande ? 2 : 1,
          "--colunas-celular": grande ? 2 : 1,
        } as React.CSSProperties;
        return (
          <Link key={c.id} role="listitem" href={`/itens?comodo=${c.id}`} className={c.acimaDoLimite ? "comodo-planta acima" : "comodo-planta"} style={estilo}>
            <span className="ocupacao" style={{ height: `${c.acimaDoLimite ? 100 : ocupacao}%` }} aria-hidden="true"></span>
            <span>
              <span className="nome">{c.nome}</span>
              <br />
              <span className="detalhe">
                {c.quantidadeItens} {c.quantidadeItens === 1 ? "item" : "itens"} · {c.quantidadeComprados} {c.quantidadeComprados === 1 ? "comprado" : "comprados"}
              </span>
            </span>
            <span>
              <span className="valor">{reaisInteiros(c.previsto)}</span>
              <br />
              <span className="detalhe detalhe-status">
                {c.acimaDoLimite
                  ? `Acima do limite em ${reaisInteiros(c.excedente)}`
                  : c.limite > 0
                    ? `${c.percentualDoLimite}% de ${reaisInteiros(c.limite)}`
                    : "Sem limite"}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
