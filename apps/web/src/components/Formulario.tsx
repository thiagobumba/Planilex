"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoAcao } from "@/lib/tipos";

type Acao = (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;

/**
 * Formulário ligado a uma server action. Mostra o erro ou a confirmação
 * logo abaixo dos campos (regra 3: feedback).
 */
export function Formulario({
  acao,
  children,
  className,
  limparAoSalvar = false,
}: {
  acao: Acao;
  children: React.ReactNode;
  className?: string;
  limparAoSalvar?: boolean;
}) {
  const [estado, executar] = useActionState(acao, {});
  return (
    <form action={executar} className={className} key={limparAoSalvar ? estado.vez : undefined}>
      {children}
      {estado.erro && (
        <p role="alert" className="aviso aviso-erro">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="aviso aviso-ok">
          {estado.ok}
        </p>
      )}
    </form>
  );
}

/** Botão de envio que se desativa e muda o texto enquanto salva. */
export function BotaoEnviar({
  children,
  carregando = "Salvando…",
  variante = "primario",
}: {
  children: React.ReactNode;
  carregando?: string;
  variante?: "primario" | "secundario" | "perigo";
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`botao botao-${variante}`} disabled={pending} aria-busy={pending}>
      {pending ? carregando : children}
    </button>
  );
}
