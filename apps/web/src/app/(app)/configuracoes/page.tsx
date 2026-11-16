import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CamposOrcamento } from "@/components/CamposOrcamento";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { orcamentoAtual } from "@/lib/dados";
import { editarOrcamento } from "../acoes";

export const metadata: Metadata = { title: "Configurações · Planilex" };

export default async function Configuracoes() {
  const orcamento = await orcamentoAtual();
  if (!orcamento) redirect("/");
  return (
    <>
      <nav aria-label="Você está em" className="trilha">
        <Link href="/">Painel</Link> <span aria-hidden="true">›</span> <span>Configurações</span>
      </nav>
      <header className="cabecalho">
        <h1>Configurações do orçamento</h1>
      </header>
      <Formulario acao={editarOrcamento} className="cartao">
        <input type="hidden" name="id" value={orcamento.id} />
        <CamposOrcamento orcamento={orcamento} />
        <div className="acoes">
          <BotaoEnviar>Salvar alterações</BotaoEnviar>
        </div>
      </Formulario>
    </>
  );
}
