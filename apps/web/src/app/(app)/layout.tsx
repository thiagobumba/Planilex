import { Logo } from "@/components/Logo";
import { Menu } from "@/components/Menu";
import { orcamentoAtual, usuarioAtual } from "@/lib/dados";
import { reaisInteiros } from "@/lib/formato";

/** Estrutura das telas logadas: menu lateral (regra 1: consistência) + conteúdo. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const [orcamento, usuario] = await Promise.all([orcamentoAtual(), usuarioAtual()]);
  return (
    <div className="app">
      <nav aria-label="Menu principal" className="menu">
        <Logo />
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
            {usuario.email}
          </span>
          <form action="/auth/sair" method="post">
            <button type="submit" className="botao-link">
              Sair
            </button>
          </form>
        </div>
      </nav>
      <main className="conteudo">{children}</main>
    </div>
  );
}
