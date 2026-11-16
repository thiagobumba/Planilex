import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirComodo, exigirItem, exigirMembro } from "../acesso.js";
import { db } from "../db.js";
import { ErroHttp } from "../erros.js";
import { num } from "../formatos.js";
import { exigirLogin } from "../plugins/autenticacao.js";

const situacao = z.enum(["PESQUISANDO", "ESCOLHIDO", "COMPRADO"]);
const dinheiro = z.coerce.number().min(0, "O valor não pode ser negativo.").max(9_999_999_999.99);

const dadosItem = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item.").max(160),
  comodoId: z.uuid(),
  quantidade: z.coerce.number().int().min(1, "A quantidade mínima é 1.").max(9999).default(1),
  situacao: situacao.default("PESQUISANDO"),
  valorPrevisto: dinheiro.nullish(),
  valorPago: dinheiro.nullish(),
  alertaPreco: z.boolean().optional(),
});

const filtros = z.object({
  comodoId: z.uuid().optional(),
  situacao: situacao.optional(),
  busca: z.string().trim().max(100).optional(),
});
const idOrcamento = z.object({ orcamentoId: z.uuid() });
const id = z.object({ id: z.uuid() });

type ItemDb = {
  id: string;
  nome: string;
  comodoId: string;
  quantidade: number;
  situacao: string;
  valorPrevisto: { toString(): string } | null;
  valorPago: { toString(): string } | null;
  alertaPreco: boolean;
  atualizadoEm: Date;
  comodo?: { nome: string };
};

const serializar = (i: ItemDb) => ({
  id: i.id,
  nome: i.nome,
  comodoId: i.comodoId,
  comodo: i.comodo?.nome,
  quantidade: i.quantidade,
  situacao: i.situacao,
  valorPrevisto: num(i.valorPrevisto),
  valorPago: num(i.valorPago),
  alertaPreco: i.alertaPreco,
  atualizadoEm: i.atualizadoEm.toISOString(),
});

/** Comprado precisa de valor pago; os outros estados não guardam valor pago. */
function regrasSituacao(d: { situacao?: string; valorPago?: number | null }) {
  if (d.situacao === "COMPRADO" && d.valorPago == null) {
    throw new ErroHttp(400, "Informe quanto foi pago para marcar o item como comprado.");
  }
}

/** Rotas de itens. Documentação: docs/api.md › Itens */
export async function rotasItens(app: FastifyInstance) {
  app.addHook("preHandler", exigirLogin);

  app.get("/orcamentos/:orcamentoId/itens", async (req) => {
    const { orcamentoId } = idOrcamento.parse(req.params);
    await exigirMembro(orcamentoId, req.usuario.id);
    const f = filtros.parse(req.query);
    const itens = await db().item.findMany({
      where: {
        comodo: { orcamentoId },
        comodoId: f.comodoId,
        situacao: f.situacao,
        nome: f.busca ? { contains: f.busca, mode: "insensitive" } : undefined,
      },
      include: { comodo: { select: { nome: true, ordem: true } } },
      orderBy: [{ comodo: { ordem: "asc" } }, { criadoEm: "asc" }],
    });
    return itens.map(serializar);
  });

  app.post("/itens", async (req, reply) => {
    const dados = dadosItem.parse(req.body);
    regrasSituacao(dados);
    await exigirComodo(dados.comodoId, req.usuario.id);
    const item = await db().item.create({
      data: { ...dados, valorPago: dados.situacao === "COMPRADO" ? dados.valorPago : null },
      include: { comodo: { select: { nome: true } } },
    });
    return reply.code(201).send(serializar(item));
  });

  app.patch("/itens/:id", async (req) => {
    const params = id.parse(req.params);
    const atual = await exigirItem(params.id, req.usuario.id);
    const dados = dadosItem.partial().parse(req.body);

    // Mover de cômodo: só para outro cômodo do mesmo orçamento.
    if (dados.comodoId && dados.comodoId !== atual.comodoId) {
      const destino = await exigirComodo(dados.comodoId, req.usuario.id);
      if (destino.orcamentoId !== atual.comodo.orcamentoId) {
        throw new ErroHttp(400, "O item só pode ser movido para um cômodo do mesmo orçamento.");
      }
    }

    const situacaoFinal = dados.situacao ?? atual.situacao;
    const valorPagoFinal = dados.valorPago !== undefined ? dados.valorPago : num(atual.valorPago);
    regrasSituacao({ situacao: situacaoFinal, valorPago: valorPagoFinal });

    const item = await db().item.update({
      where: { id: params.id },
      data: { ...dados, valorPago: situacaoFinal === "COMPRADO" ? valorPagoFinal : null },
      include: { comodo: { select: { nome: true } } },
    });
    return serializar(item);
  });

  app.delete("/itens/:id", async (req, reply) => {
    const params = id.parse(req.params);
    await exigirItem(params.id, req.usuario.id);
    await db().item.delete({ where: { id: params.id } });
    return reply.code(204).send();
  });
}
