import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CamposOrcamento } from "@/components/CamposOrcamento";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { api } from "@/lib/api";
import { orcamentoAtual } from "@/lib/dados";
import type { Pessoas } from "@/lib/tipos";
import { cancelarConvite, convidarPessoa, editarOrcamento, removerPessoa } from "../acoes";

export const metadata: Metadata = { title: "Configurações · Planilex" };

export default async function Configuracoes() {
  const orcamento = await orcamentoAtual();
  if (!orcamento) redirect("/");
  const pessoas = await api<Pessoas>(`/orcamentos/${orcamento.id}/pessoas`);

  return (
    <>
      <nav aria-label="Você está em" className="trilha">
        <Link href="/">Painel</Link> <span aria-hidden="true">›</span> <span>Configurações</span>
      </nav>
      <header className="cabecalho">
        <h1>Configurações</h1>
      </header>

      <section className="cartao" aria-labelledby="pessoas-titulo" id="pessoas">
        <div>
          <h2 id="pessoas-titulo">Pessoas com acesso</h2>
          <p className="suave">Todos aqui veem e editam o mesmo orçamento. Cada pessoa entra com o próprio login (Google ou e-mail e senha).</p>
        </div>

        <ul className="lista-pessoas">
          {pessoas.membros.map((m) => (
            <li key={m.usuarioId}>
              <div>
                <strong>{m.email ?? "E-mail ainda não registrado"}</strong>
                {m.voce && <span className="suave"> (você)</span>}
                <span className={m.papel === "DONO" ? "etiqueta etiqueta-comprado" : "etiqueta etiqueta-escolhido"}>
                  {m.papel === "DONO" ? "Dono" : "Pode editar"}
                </span>
              </div>
              {pessoas.podeGerenciar && !m.voce && (
                <details className="confirmar">
                  <summary>Remover acesso</summary>
                  <Formulario acao={removerPessoa}>
                    <input type="hidden" name="orcamentoId" value={orcamento.id} />
                    <input type="hidden" name="usuarioId" value={m.usuarioId} />
                    <input type="hidden" name="email" value={m.email ?? ""} />
                    <BotaoEnviar variante="perigo" carregando="Removendo…">
                      Sim, remover {m.email ?? "esta pessoa"}
                    </BotaoEnviar>
                  </Formulario>
                </details>
              )}
            </li>
          ))}
          {pessoas.convites.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.email}</strong>
                <span className="etiqueta etiqueta-pesquisando">Convite pendente</span>
                <span className="dica bloco">Vira acesso quando essa pessoa entrar no Planilex pela primeira vez.</span>
              </div>
              {pessoas.podeGerenciar && (
                <Formulario acao={cancelarConvite}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="email" value={c.email} />
                  <BotaoEnviar variante="secundario" carregando="Cancelando…">
                    Cancelar convite
                  </BotaoEnviar>
                </Formulario>
              )}
            </li>
          ))}
        </ul>

        {pessoas.podeGerenciar ? (
          <Formulario acao={convidarPessoa} className="linha-comodo" limparAoSalvar>
            <input type="hidden" name="orcamentoId" value={orcamento.id} />
            <label className="campo">
              Convidar por e-mail
              <input name="email" type="email" required placeholder="Ex.: pessoa@exemplo.com" autoComplete="off" />
              <span className="dica">Use o mesmo e-mail com que a pessoa vai entrar (o do Google ou o da conta com senha).</span>
            </label>
            <BotaoEnviar carregando="Convidando…">Convidar</BotaoEnviar>
          </Formulario>
        ) : (
          <p className="suave">Só o dono do orçamento pode convidar ou remover pessoas.</p>
        )}
      </section>

      <section className="cartao" aria-labelledby="dados-titulo">
        <h2 id="dados-titulo">Dados do orçamento</h2>
        <Formulario acao={editarOrcamento}>
          <input type="hidden" name="id" value={orcamento.id} />
          <CamposOrcamento orcamento={orcamento} />
          <div className="acoes">
            <BotaoEnviar>Salvar alterações</BotaoEnviar>
          </div>
        </Formulario>
      </section>
    </>
  );
}
