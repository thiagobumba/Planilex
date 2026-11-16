import { Logo } from "@/components/Logo";
import { Menu } from "@/components/Menu";
import { orcamentoAtual, usuarioAtual } from "@/lib/dados";
import { unstable_rethrow } from "next/navigation";
import { reaisInteiros } from "@/lib/formato";

/** Estrutura das telas logadas: menu lateral (regra 1: consistência) + conteúdo. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  // Se a API falhar, o menu (com o "Sair") continua aparecendo; a página mostra o erro (error.tsx).
  let orcamento = null;
  try {
    orcamento = await orcamentoAtual();
  } catch (e) {
    unstable_rethrow(e);
  }
  return (
    <div className="app">
      <nav aria-label="Menu principal" className="menu">
        <Logo sobreVerde />
        <Menu />
        <div className="menu-rodape">
          {orcamento && (
            <div className="menu-saldo">
              <span className="suave">Saldo disponível</span>
              <strong className={orcamento.resumo.disponivel < 0 ? "valor-negativo" : "valor-positivo"}>
                {reaisInteiros(orcamento.resumo.disponivel)}
              </strong>
            </div>
          )}
          <span className="suave menu-email" title={usuario.email}>
            Conectado como {usuario.email}
          </span>
          <form action="/auth/sair" method="post">
            <button type="submit" className="botao botao-secundario botao-sair">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"></path>
                <path d="M10 17l-5-5 5-5M5 12h11"></path>
              </svg>
              Sair
            </button>
          </form>
        </div>
      </nav>
      <main className="conteudo">{children}</main>
    </div>
  );
}
