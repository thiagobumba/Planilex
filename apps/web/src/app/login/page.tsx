import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { BotaoGoogle } from "./BotaoGoogle";
import { explicarErroLogin } from "./erros";

export const metadata: Metadata = { title: "Entrar · Planilex" };

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="login">
      <div className="login-cartao">
        <Logo />
        <h1>Orçamento do casamento e da casa nova</h1>
        <p className="suave">Planeje cada móvel, eletrodoméstico e material, compare preços e acompanhe quanto ainda cabe no orçamento.</p>
        {supabaseConfigurado ? (
          <BotaoGoogle />
        ) : (
          <p role="alert" className="aviso aviso-erro">
            O login ainda não está configurado. Preencha <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code> e reinicie o site.
          </p>
        )}
        {erro && (
          <div role="alert" className="aviso aviso-erro">
            <p>{explicarErroLogin(erro)}</p>
            <p className="detalhe-tecnico">Detalhe técnico: {erro}</p>
          </div>
        )}
      </div>
    </main>
  );
}
