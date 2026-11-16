"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import { explicarErroSenha } from "./erros";

type Modo = "entrar" | "criar" | "esqueci";

const TITULOS: Record<Modo, string> = {
  entrar: "Entrar",
  criar: "Criar conta",
  esqueci: "Enviar link para nova senha",
};

/** Login, criação de conta e "esqueci a senha" por e-mail. */
export function FormEmail() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function trocar(novo: Modo) {
    setModo(novo);
    setErro(null);
    setAviso(null);
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email") ?? "").trim();
    const senha = String(dados.get("senha") ?? "");
    const confirmacao = String(dados.get("confirmacao") ?? "");
    setErro(null);
    setAviso(null);

    if (modo === "criar" && senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setCarregando(true);
    const supabase = criarClienteNavegador();
    const retorno = `${window.location.origin}/auth/callback`;

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setErro(explicarErroSenha(error.message));
        setCarregando(false);
        return;
      }
      router.replace("/");
      router.refresh();
      return;
    }

    if (modo === "criar") {
      const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: retorno } });
      setCarregando(false);
      if (error) return setErro(explicarErroSenha(error.message));
      if (data.session) {
        // Confirmação de e-mail desligada no Supabase: já entra direto.
        router.replace("/");
        router.refresh();
        return;
      }
      // Por segurança o Supabase não diz se o e-mail já tinha conta; a mensagem cobre os dois casos.
      setAviso(`Enviamos um link de confirmação para ${email}. Abra o e-mail neste navegador para ativar a conta. Se já tinha conta com esse e-mail, use “Entrar”.`);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${retorno}?proxima=/auth/nova-senha` });
    setCarregando(false);
    if (error) return setErro(explicarErroSenha(error.message));
    setAviso(`Se existir uma conta com ${email}, enviamos um link para criar uma nova senha. Abra o e-mail neste navegador.`);
  }

  return (
    <div className="form-email">
      {modo !== "esqueci" && (
        <div className="alternar" role="tablist" aria-label="Entrar ou criar conta">
          <button type="button" role="tab" aria-selected={modo === "entrar"} className={modo === "entrar" ? "ativo" : ""} onClick={() => trocar("entrar")}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={modo === "criar"} className={modo === "criar" ? "ativo" : ""} onClick={() => trocar("criar")}>
            Criar conta
          </button>
        </div>
      )}
      {modo === "esqueci" && <p className="suave">Informe o seu e-mail. Enviaremos um link para você criar uma nova senha.</p>}

      <form onSubmit={enviar} className="campos-login" key={modo}>
        <label className="campo">
          E-mail
          <input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" />
        </label>
        {modo !== "esqueci" && (
          <label className="campo">
            Senha
            <input
              name="senha"
              type="password"
              required
              minLength={modo === "criar" ? 8 : undefined}
              autoComplete={modo === "criar" ? "new-password" : "current-password"}
            />
            {modo === "criar" && <span className="dica">Pelo menos 8 caracteres, misturando letras e números.</span>}
          </label>
        )}
        {modo === "criar" && (
          <label className="campo">
            Repita a senha
            <input name="confirmacao" type="password" required minLength={8} autoComplete="new-password" />
          </label>
        )}

        <button type="submit" className="botao botao-primario" disabled={carregando} aria-busy={carregando}>
          {carregando ? "Aguarde…" : TITULOS[modo]}
        </button>

        {erro && (
          <p role="alert" className="aviso aviso-erro">
            {erro}
          </p>
        )}
        {aviso && (
          <p role="status" className="aviso aviso-ok">
            {aviso}
          </p>
        )}
      </form>

      {modo === "entrar" && (
        <button type="button" className="botao-link" onClick={() => trocar("esqueci")}>
          Esqueci a senha
        </button>
      )}
      {modo === "esqueci" && (
        <button type="button" className="botao-link" onClick={() => trocar("entrar")}>
          Voltar para o login
        </button>
      )}
    </div>
  );
}
