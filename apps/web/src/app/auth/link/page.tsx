"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/Logo";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

/**
 * Destino dos links enviados por e-mail no convite ("Invite user" e "Magic link").
 * Esses e-mails saem do servidor, então o Supabase devolve os tokens no "#" da URL
 * (fluxo implícito), que só o navegador enxerga. Aqui a sessão é gravada em cookies.
 */
export default function LinkDoEmail() {
  const router = useRouter();
  const executou = useRef(false);

  useEffect(() => {
    if (executou.current) return;
    executou.current = true;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const busca = new URLSearchParams(window.location.search);
    const erro = hash.get("error_description") ?? busca.get("error_description") ?? hash.get("error") ?? busca.get("error");
    const irParaLogin = (motivo: string) => router.replace(`/login?erro=${encodeURIComponent(motivo)}`);

    if (erro) return irParaLogin(erro);
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) return irParaLogin("O link do e-mail veio sem os dados de acesso.");

    criarClienteNavegador()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) return irParaLogin(error.message);
        // Conta criada pelo convite ainda não tem senha: oferece criar uma.
        router.replace(hash.get("type") === "invite" ? "/auth/nova-senha?boas-vindas=1" : "/");
        router.refresh();
      });
  }, [router]);

  return (
    <main className="login-simples">
      <div className="login-cartao">
        <Logo />
        <p role="status" className="suave">
          Entrando no Planilex…
        </p>
      </div>
    </main>
  );
}
