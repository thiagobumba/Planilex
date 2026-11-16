import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirComodo, exigirItem, exigirMembro } from "../acesso.js";
import { db } from "../db.js";
import { ErroHttp } from "../erros.js";
import { num } from "../formatos.js";
import { exigirLogin } from "../plugins/autenticacao.js";

const situacao = z.enum(["PESQUISANDO", "CADASTRADO", "ESCOLHIDO", "COMPRADO"]);
const dinheiro = z.coerce.number().min(0, "O valor não pode ser negativo.").max(9_999_999_999.99);

const ofertaEscolhida = z.object({
  loja: z.string().trim().min(1).max(120),
  titulo: z.string().trim().min(1).max(300),
  preco: z.coerce.number().positive().max(9_999_999_999.99),
  link: z.url().max(2000),
  consultadoEm: z.iso.datetime().optional(),
});

const dadosItem = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item.").max(160),
  comodoId: z.uuid(),
  quantidade: z.coerce.number().int().min(1, "A quantidade mínima é 1.").max(9999).default(1),
  situacao: situacao.default("PESQUISANDO"),
  valorPrevisto: dinheiro.nullish(),
  valorPago: dinheiro.nullish(),
  alertaPreco: z.boolean().optional(),
  /** Oferta escolhida na busca de preços: vira o "Melhor preço" do item. */
  oferta: ofertaEscolhida.nullish(),
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
  ofertaEscolhida?: { loja: string; titulo: string; preco: { toString(): string }; url: string; consultadoEm: Date } | null;
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
  ofertaEscolhida: i.ofertaEscolhida
    ? {
        loja: i.ofertaEscolhida.loja,
        titulo: i.ofertaEscolhida.titulo,
        preco: num(i.ofertaEscolhida.preco),
        link: i.ofertaEscolhida.url,
        consultadoEm: i.ofertaEscolhida.consultadoEm.toISOString(),
      }
    : null,
});

/** Grava a oferta escolhida, liga ao item e registra o preço do dia no histórico. */
async function guardarOferta(itemId: string, o: z.infer<typeof ofertaEscolhida>) {
  const consultadoEm = o.consultadoEm ? new Date(o.consultadoEm) : new Date();
  const oferta = await db().oferta.create({
    data: { itemId, loja: o.loja, titulo: o.titulo, preco: o.preco, frete: 0, total: o.preco, url: o.link, consultadoEm },
  });
  const dia = new Date(Date.UTC(consultadoEm.getUTCFullYear(), consultadoEm.getUTCMonth(), consultadoEm.getUTCDate()));
  const anterior = await db().historicoPreco.findUnique({ where: { itemId_data: { itemId, data: dia } } });
  if (!anterior || Number(anterior.menorPreco.toString()) > o.preco) {
    await db().historicoPreco.upsert({
      where: { itemId_data: { itemId, data: dia } },
      create: { itemId, data: dia, menorPreco: o.preco },
      update: { menorPreco: o.preco },
    });
  }
  return oferta.id;
}

const incluir = { comodo: { select: { nome: true } }, ofertaEscolhida: true } as const;

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
      include: { comodo: { select: { nome: true, ordem: true } }, ofertaEscolhida: true },
      orderBy: [{ comodo: { ordem: "asc" } }, { criadoEm: "asc" }],
    });
    return itens.map(serializar);
  });

  app.post("/itens", async (req, reply) => {
    const dados = dadosItem.parse(req.body);
    regrasSituacao(dados);
    await exigirComodo(dados.comodoId, req.usuario.id);
    const { oferta, ...campos } = dados;
    const criado = await db().item.create({
      data: { ...campos, valorPago: campos.situacao === "COMPRADO" ? campos.valorPago : null },
    });
    if (oferta) {
      await db().item.update({ where: { id: criado.id }, data: { ofertaEscolhidaId: await guardarOferta(criado.id, oferta) } });
    }
    const item = await db().item.findUniqueOrThrow({ where: { id: criado.id }, include: incluir });
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

    const { oferta, ...campos } = dados;
    const ofertaEscolhidaId =
      oferta === undefined ? undefined : oferta === null ? null : await guardarOferta(params.id, oferta);
    const item = await db().item.update({
      where: { id: params.id },
      data: { ...campos, ofertaEscolhidaId, valorPago: situacaoFinal === "COMPRADO" ? valorPagoFinal : null },
      include: incluir,
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
