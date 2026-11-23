import { api } from "@/lib/api";
import { orcamentoAtual } from "@/lib/dados";

/** Baixa o backup (JSON) do orçamento: o site busca na API com o token de quem está logado. */
export async function GET() {
  const orcamento = await orcamentoAtual();
  if (!orcamento) return new Response("Nenhum orçamento para salvar.", { status: 404 });
  const backup = await api<unknown>(`/orcamentos/${orcamento.id}/backup`);
  const agora = new Date();
  const d = (n: number) => String(n).padStart(2, "0");
  const nome = `planilex-${agora.getFullYear()}-${d(agora.getMonth() + 1)}-${d(agora.getDate())}-${d(agora.getHours())}${d(agora.getMinutes())}.json`;
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}"`,
      "cache-control": "no-store",
    },
  });
}
