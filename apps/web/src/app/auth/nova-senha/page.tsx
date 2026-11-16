import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormNovaSenha } from "./FormNovaSenha";

export const metadata: Metadata = { title: "Nova senha · Planilex" };

/** Aberta pelo link de "Esqueci a senha" (o callback já criou a sessão). */
export default async function NovaSenha({ searchParams }: { searchParams: Promise<{ "boas-vindas"?: string }> }) {
  const boasVindas = (await searchParams)["boas-vindas"] === "1";
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return (
    <main className="login">
      <div className="login-cartao">
        <Logo />
        <h1>{boasVindas ? "Bem-vindo ao Planilex!" : "Criar nova senha"}</h1>
        {email ? (
          <>
            {boasVindas ? (
              <p className="suave">
                Você foi convidado para um orçamento compartilhado. Crie uma senha para entrar depois com <strong>{email}</strong>. Se esse e-mail
                for uma conta Google, você também pode entrar pelo botão do Google.
              </p>
            ) : (
              <p className="suave">Conta: {email}</p>
            )}
            <FormNovaSenha />
            {boasVindas && (
              <Link href="/" className="botao-link">
                Pular por agora e ver o orçamento
              </Link>
            )}
          </>
        ) : (
          <>
            <p role="alert" className="aviso aviso-erro">
              O link não é mais válido ou foi aberto em outro navegador. Peça um novo em “Esqueci a senha”.
            </p>
            <Link href="/login" className="botao botao-secundario">
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
