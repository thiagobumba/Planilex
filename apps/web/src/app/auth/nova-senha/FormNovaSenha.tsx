"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { explicarErroSenha } from "@/app/login/erros";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export function FormNovaSenha() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const senha = String(dados.get("senha") ?? "");
    if (senha !== String(dados.get("confirmacao") ?? "")) {
      setErro("As duas senhas não são iguais.");
      return;
    }
    setErro(null);
    setCarregando(true);
    const { error } = await criarClienteNavegador().auth.updateUser({ password: senha });
    if (error) {
      setErro(explicarErroSenha(error.message));
      setCarregando(false);
      return;
    }
    router.replace("/?senha=alterada");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="campos-login">
      <label className="campo">
        Nova senha
        <input name="senha" type="password" required minLength={8} autoComplete="new-password" />
        <span className="dica">Pelo menos 8 caracteres, misturando letras e números.</span>
      </label>
      <label className="campo">
        Repita a nova senha
        <input name="confirmacao" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <button type="submit" className="botao botao-primario" disabled={carregando} aria-busy={carregando}>
        {carregando ? "Salvando…" : "Salvar nova senha"}
      </button>
      {erro && (
        <p role="alert" className="aviso aviso-erro">
          {erro}
        </p>
      )}
    </form>
  );
}
