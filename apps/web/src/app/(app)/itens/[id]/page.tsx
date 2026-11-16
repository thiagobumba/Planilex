import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CamposItem } from "@/components/CamposItem";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { api } from "@/lib/api";
import { orcamentoAtual } from "@/lib/dados";
import type { Item } from "@/lib/tipos";
import { editarItem, excluirItem } from "../../acoes";

export const metadata: Metadata = { title: "Editar item · Planilex" };

export default async function EditarItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orcamento = await orcamentoAtual();
  if (!orcamento) redirect("/");
  const itens = await api<Item[]>(`/orcamentos/${orcamento.id}/itens`);
  const item = itens.find((i) => i.id === id);
  if (!item) notFound();

  return (
    <>
      <nav aria-label="Você está em" className="trilha">
        <Link href="/">Painel</Link> <span aria-hidden="true">›</span> <Link href="/itens">Itens</Link>{" "}
        <span aria-hidden="true">›</span> <span>{item.nome}</span>
      </nav>
      <header className="cabecalho">
        <h1>Editar item</h1>
      </header>

      <Formulario acao={editarItem} className="cartao">
        <input type="hidden" name="id" value={item.id} />
        <CamposItem comodos={orcamento.comodos} item={item} />
        <div className="acoes">
          <Link href="/itens" className="botao botao-secundario">
            Cancelar
          </Link>
          <BotaoEnviar>Salvar alterações</BotaoEnviar>
        </div>
      </Formulario>

      <details className="cartao zona-perigo">
        <summary>Excluir este item</summary>
        <p>O item “{item.nome}” sai do orçamento e os totais são recalculados. Isso não pode ser desfeito.</p>
        <Formulario acao={excluirItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="nome" value={item.nome} />
          <BotaoEnviar variante="perigo" carregando="Excluindo…">
            Sim, excluir “{item.nome}”
          </BotaoEnviar>
        </Formulario>
      </details>
    </>
  );
}
