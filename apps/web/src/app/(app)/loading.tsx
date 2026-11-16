/**
 * Mostrado na hora em que se clica num link do menu, enquanto a página busca os dados
 * (regra 3: feedback). O menu lateral continua na tela.
 */
export default function Carregando() {
  return (
    <div className="carregando" role="status" aria-live="polite">
      <span className="visualmente-oculto">Carregando…</span>
      <div className="esqueleto esqueleto-titulo" />
      <div className="esqueleto esqueleto-cartao" />
      <div className="esqueleto esqueleto-linha" />
      <div className="esqueleto esqueleto-linha" />
      <div className="esqueleto esqueleto-linha" />
    </div>
  );
}
