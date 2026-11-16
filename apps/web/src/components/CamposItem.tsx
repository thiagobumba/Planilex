"use client";

import { useRef, useState, useTransition } from "react";
import { buscarPrecos } from "@/app/(app)/acoes";
import { lerValor, reais } from "@/lib/formato";
import type { Item, OfertaEncontrada, OfertaEscolhida, ResultadoBusca, ResumoComodo, Situacao } from "@/lib/tipos";

const fmt = (v?: number | null) => (v == null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const hora = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date().toDateString() === d.toDateString();
  return `${hoje ? "hoje" : d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

/**
 * Campos de item com busca de preços.
 * - "Buscar preços" (ou Enter no nome) consulta o Google Shopping pela API do Planilex.
 * - "Usar este preço" preenche o valor previsto (preço × quantidade) e guarda a oferta no item.
 * - O "valor pago" só aparece quando a situação é "Comprado" (regra 5: prevenção de erros).
 */
/** Ofertas mostradas por página na lista da busca de preços. */
const POR_PAGINA = 10;

export function CamposItem({
  comodos,
  item,
  comodoPadrao,
}: {
  comodos: Pick<ResumoComodo, "id" | "nome">[];
  item?: Item;
  comodoPadrao?: string;
}) {
  // "Comprado? Sim/Não" é a situação COMPRADO; antes da compra vale a etapa (Pesquisando, Cadastrado, Escolhido).
  const [comprado, setComprado] = useState(item?.situacao === "COMPRADO");
  const [etapa, setEtapa] = useState<Exclude<Situacao, "COMPRADO">>(
    item && item.situacao !== "COMPRADO" ? item.situacao : item?.ofertaEscolhida ? "ESCOLHIDO" : "PESQUISANDO",
  );
  const situacao: Situacao = comprado ? "COMPRADO" : etapa;
  const [valorPago, setValorPago] = useState(fmt(item?.valorPago));
  const [nome, setNome] = useState(item?.nome ?? "");
  const [quantidade, setQuantidade] = useState(String(item?.quantidade ?? 1));
  const [valorPrevisto, setValorPrevisto] = useState(fmt(item?.valorPrevisto));

  // Oferta: sem mudança (não envia nada), null (remover) ou a nova escolhida.
  const [oferta, setOferta] = useState<OfertaEscolhida | null>(item?.ofertaEscolhida ?? null);
  const [ofertaMudou, setOfertaMudou] = useState(false);

  const [busca, setBusca] = useState<ResultadoBusca | null>(null);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [listaAberta, setListaAberta] = useState(false);
  const [pagina, setPagina] = useState(1);
  const topoLista = useRef<HTMLElement>(null);
  const [buscando, iniciar] = useTransition();

  function pesquisar(atualizar = false) {
    const termo = nome.trim();
    if (termo.length < 3) {
      setErroBusca("Digite pelo menos 3 letras no nome do item para buscar preços.");
      return;
    }
    setErroBusca(null);
    iniciar(async () => {
      const r = await buscarPrecos(termo, atualizar);
      if (r.erro) {
        setErroBusca(r.erro);
        setBusca(null);
      } else if (r.resultado) {
        setBusca(r.resultado);
        setPagina(1);
        setListaAberta(true);
      }
    });
  }

  function usar(o: OfertaEncontrada) {
    const qtd = Math.max(1, Number(quantidade) || 1);
    setValorPrevisto(fmt(Math.round(o.preco * qtd * 100) / 100));
    setOferta({ loja: o.loja, titulo: o.titulo, preco: o.preco, link: o.link, consultadoEm: busca?.consultadoEm ?? new Date().toISOString() });
    setOfertaMudou(true);
    setListaAberta(false);
    // Preço vindo da busca: o item deixa de estar "Pesquisando".
    if (etapa === "PESQUISANDO") setEtapa("CADASTRADO");
  }

  function remover() {
    setOferta(null);
    setOfertaMudou(true);
  }

  function irPara(p: number) {
    setPagina(p);
    topoLista.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const totalPaginas = busca ? Math.max(1, Math.ceil(busca.ofertas.length / POR_PAGINA)) : 1;
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const ofertasDaPagina = busca ? busca.ofertas.slice(inicio, inicio + POR_PAGINA) : [];

  const valorOferta = ofertaMudou ? (oferta ? JSON.stringify(oferta) : "null") : "";
  const previstoNumero = lerValor(valorPrevisto);

  return (
    <div className="grade-campos">
      <div className="campo campo-largo">
        <label htmlFor="campo-nome-item">Item</label>
        <div className="linha-busca">
          <input
            id="campo-nome-item"
            name="nome"
            required
            maxLength={160}
            placeholder="Ex.: Micro-ondas 30 L inox"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                pesquisar();
              }
            }}
            aria-describedby="dica-busca"
          />
          <button type="button" className="botao botao-secundario" onClick={() => pesquisar()} disabled={buscando} aria-busy={buscando}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5"></circle>
              <path d="M20 20l-4.2-4.2"></path>
            </svg>
            {buscando ? "Pesquisando…" : "Buscar preços"}
          </button>
        </div>
        <span className="dica" id="dica-busca">
          Digite o produto e clique em “Buscar preços” (ou aperte Enter) para ver ofertas de várias lojas.
        </span>
      </div>

      {buscando && (
        <p role="status" className="aviso aviso-info campo-largo">
          Pesquisando “{nome.trim()}” nas lojas…
        </p>
      )}
      {erroBusca && (
        <p role="alert" className="aviso aviso-erro campo-largo">
          {erroBusca}
        </p>
      )}

      {oferta && (
        <div className="oferta-escolhida campo-largo">
          <div>
            <span className="rotulo">Oferta escolhida</span>
            <span>
              <strong>{oferta.loja}</strong> · {reais(oferta.preco)} <span className="suave">· consultado {hora(oferta.consultadoEm)}</span>
            </span>
            <a href={oferta.link} target="_blank" rel="noopener noreferrer">
              Ver na loja ↗
            </a>
          </div>
          <div className="acoes-oferta">
            {busca && !listaAberta && (
              <button type="button" className="botao-link" onClick={() => setListaAberta(true)}>
                Ver outras ofertas
              </button>
            )}
            <button type="button" className="botao-link" onClick={remover}>
              Remover oferta
            </button>
          </div>
        </div>
      )}

      {busca && listaAberta && (
        <section ref={topoLista} className="resultado-busca campo-largo" aria-label="Ofertas encontradas">
          <div className="linha-entre">
            <span className="suave">
              {busca.ofertas.length} {busca.ofertas.length === 1 ? "oferta" : "ofertas"} para “{busca.termo}” · consultado {hora(busca.consultadoEm)}
              {busca.emCache && " (busca guardada)"}
            </span>
            <span className="acoes-oferta">
              <button type="button" className="botao-link" onClick={() => pesquisar(true)} disabled={buscando}>
                Atualizar preços
              </button>
              <button type="button" className="botao-link" onClick={() => setListaAberta(false)}>
                Fechar
              </button>
            </span>
          </div>
          {busca.ofertas.length === 0 ? (
            <p className="suave">Nenhuma oferta encontrada. Tente uma descrição mais simples (ex.: “micro-ondas 30 litros”).</p>
          ) : (
            <ul className="lista-ofertas">
              {ofertasDaPagina.map((o, j) => {
                const i = inicio + j;
                return (
                <li key={`${o.loja}-${o.preco}-${i}`} className={i === 0 ? "melhor" : undefined}>
                  {o.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.imagem} alt="" width={56} height={56} loading="lazy" />
                  ) : (
                    <span className="sem-imagem" aria-hidden="true"></span>
                  )}
                  <div className="oferta-info">
                    {i === 0 && <span className="etiqueta etiqueta-comprado">Menor preço</span>}
                    <span className="oferta-titulo">{o.titulo}</span>
                    <span className="suave">
                      {o.loja}
                      {o.entrega && ` · ${o.entrega}`}
                    </span>
                  </div>
                  <strong className="oferta-preco">{reais(o.preco)}</strong>
                  <div className="oferta-acoes">
                    <button type="button" className="botao botao-primario" onClick={() => usar(o)}>
                      Usar este preço
                    </button>
                    <a href={o.link} target="_blank" rel="noopener noreferrer">
                      Ver na loja ↗
                    </a>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
          {totalPaginas > 1 && (
            <nav className="paginacao" aria-label="Páginas de ofertas">
              <button type="button" className="botao botao-secundario" onClick={() => irPara(paginaAtual - 1)} disabled={paginaAtual === 1}>
                ← Anterior
              </button>
              <span className="paginas">
                {Array.from({ length: totalPaginas }, (_, k) => k + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={p === paginaAtual ? "pagina atual" : "pagina"}
                    aria-current={p === paginaAtual ? "page" : undefined}
                    aria-label={`Página ${p}`}
                    onClick={() => irPara(p)}
                  >
                    {p}
                  </button>
                ))}
              </span>
              <span className="suave paginacao-resumo">
                {inicio + 1}–{inicio + ofertasDaPagina.length} de {busca.ofertas.length}
              </span>
              <button type="button" className="botao botao-secundario" onClick={() => irPara(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}>
                Próxima →
              </button>
            </nav>
          )}
          <p className="dica">Preços do Google Shopping no momento da consulta; o frete pode não estar incluído.</p>
        </section>
      )}

      <input type="hidden" name="oferta" value={valorOferta} />

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
        <input name="quantidade" type="number" min={1} max={9999} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
      </label>
      <label className="campo">
        Valor previsto (R$)
        <input name="valorPrevisto" inputMode="decimal" placeholder="Ex.: 689,90" value={valorPrevisto} onChange={(e) => setValorPrevisto(e.target.value)} />
        <span className="dica">
          Total do item, já com a quantidade.
          {oferta?.preco != null && Number(quantidade) > 1 && previstoNumero != null && !Number.isNaN(previstoNumero) && (
            <> ({quantidade} × {reais(oferta.preco)})</>
          )}
        </span>
      </label>
      <fieldset className="campo campo-comprado">
        <legend>Comprado?</legend>
        <div className="alternador" role="radiogroup">
          <label className={!comprado ? "opcao ativa" : "opcao"}>
            <input type="radio" name="comprado" value="nao" checked={!comprado} onChange={() => setComprado(false)} />
            Não
          </label>
          <label className={comprado ? "opcao ativa" : "opcao"}>
            <input
              type="radio"
              name="comprado"
              value="sim"
              checked={comprado}
              onChange={() => {
                setComprado(true);
                if (!valorPago) setValorPago(valorPrevisto);
              }}
            />
            Sim
          </label>
        </div>
      </fieldset>
      <input type="hidden" name="situacao" value={situacao} />
      {comprado ? (
        <label className="campo">
          Valor pago (R$)
          <input name="valorPago" required inputMode="decimal" placeholder="0,00" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
          <span className="dica">Total pago pelo item, já com a quantidade.</span>
        </label>
      ) : (
        <label className="campo">
          Situação
          <select value={etapa} onChange={(e) => setEtapa(e.target.value as Exclude<Situacao, "COMPRADO">)}>
            <option value="PESQUISANDO">Pesquisando</option>
            <option value="CADASTRADO">Cadastrado, preço da busca</option>
            <option value="ESCOLHIDO">Escolhido, ainda vou comprar</option>
          </select>
        </label>
      )}
    </div>
  );
}
