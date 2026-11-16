import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { BotaoGoogle } from "./BotaoGoogle";
import { explicarErroLogin } from "./erros";
import { FormEmail } from "./FormEmail";

export const metadata: Metadata = { title: "Entrar · Planilex" };

/** Tela inicial (identidade B · Casa Nova): login à esquerda, vitrine do produto à direita. */
export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="login">
      <section className="login-lado">
        <div className="login-conteudo">
          <Logo />
          <div className="login-titulo">
            <h1>Montem a casa sem estourar o orçamento.</h1>
            <p className="suave">Entre para ver o orçamento de vocês.</p>
          </div>
          {erro && (
            <div role="alert" className="aviso aviso-erro">
              <p>{explicarErroLogin(erro)}</p>
              <p className="detalhe-tecnico">Detalhe técnico: {erro}</p>
            </div>
          )}
          {supabaseConfigurado ? (
            <>
              <BotaoGoogle />
              <div className="divisor" role="separator">
                <span>ou com e-mail</span>
              </div>
              <FormEmail />
            </>
          ) : (
            <p role="alert" className="aviso aviso-erro">
              O login ainda não está configurado. Preencha <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code> e reinicie o site.
            </p>
          )}
        </div>
      </section>

      <section className="login-vitrine" aria-label="Como o Planilex funciona">
        <figure className="vitrine-cartao">
          <div className="linha-entre">
            <strong className="vitrine-nome">Nossa casa</strong>
            <span className="suave">exemplo</span>
          </div>
          <div className="vitrine-saldo">
            <span>Disponível</span>
            <strong>R$ 18.130</strong>
          </div>
          <ul className="vitrine-barras">
            <li>
              <div className="linha-entre">
                <span>Cozinha</span>
                <span className="suave">95%</span>
              </div>
              <div className="barra">
                <div className="barra-atencao" style={{ width: "95%" }}></div>
              </div>
            </li>
            <li>
              <div className="linha-entre">
                <span>Sala</span>
                <span className="suave">65%</span>
              </div>
              <div className="barra">
                <div className="barra-ok" style={{ width: "65%" }}></div>
              </div>
            </li>
            <li>
              <div className="linha-entre">
                <span>Quarto</span>
                <span className="texto-alerta">acima em R$ 800</span>
              </div>
              <div className="barra">
                <div className="barra-acima" style={{ width: "100%" }}></div>
              </div>
            </li>
          </ul>
          <figcaption className="visualmente-oculto">Exemplo de painel: saldo disponível e uso do limite por cômodo.</figcaption>
        </figure>
        <ul className="vitrine-recursos">
          <li>Orçamento por cômodo</li>
          <li>Preços de várias lojas</li>
          <li>Compartilhado a dois</li>
        </ul>
      </section>
    </main>
  );
}
