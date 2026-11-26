import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirComodo, exigirMembro } from "../acesso.js";
import { db } from "../db.js";
import { ErroHttp } from "../erros.js";
import { num } from "../formatos.js";
import { exigirLogin } from "../plugins/autenticacao.js";

const camposComodo = z.object({
  nome: z.string().trim().min(1, "Informe um nome.").max(80),
  limite: z.coerce.number().min(0, "O limite não pode ser negativo.").max(9_999_999_999.99),
  ordem: z.coerce.number().int().min(0).optional(),
});
// O padrão do limite fica só na criação: no zod v4, `.partial()` ainda aplicaria o `.default(0)`
// e um PATCH só com o nome zeraria o limite.
const criarComodo = camposComodo.extend({ limite: camposComodo.shape.limite.default(0) });
const editarComodo = camposComodo.partial();
const idOrcamento = z.object({ orcamentoId: z.uuid() });
const id = z.object({ id: z.uuid() });

const serializar = (c: { id: string; nome: string; limite: { toString(): string }; ordem: number }) => ({
  id: c.id,
  nome: c.nome,
  limite: num(c.limite)!,
  ordem: c.ordem,
});

/** Erro do Prisma quando o nome do cômodo já existe no orçamento. */
const nomeRepetido = (e: unknown) => (e as { code?: string })?.code === "P2002";

/** Rotas de cômodos. Documentação: docs/api.md › Cômodos */
export async function rotasComodos(app: FastifyInstance) {
  app.addHook("preHandler", exigirLogin);

  app.post("/orcamentos/:orcamentoId/comodos", async (req, reply) => {
    const { orcamentoId } = idOrcamento.parse(req.params);
    await exigirMembro(orcamentoId, req.usuario.id);
    const dados = criarComodo.parse(req.body);
    const ordem =
      dados.ordem ?? ((await db().comodo.aggregate({ where: { orcamentoId }, _max: { ordem: true } }))._max.ordem ?? -1) + 1;
    try {
      const comodo = await db().comodo.create({ data: { orcamentoId, nome: dados.nome, limite: dados.limite, ordem } });
      return reply.code(201).send(serializar(comodo));
    } catch (e) {
      if (nomeRepetido(e)) throw new ErroHttp(409, `Já existe um cômodo chamado "${dados.nome}".`);
      throw e;
    }
  });

  app.patch("/comodos/:id", async (req) => {
    const params = id.parse(req.params);
    await exigirComodo(params.id, req.usuario.id);
    const dados = editarComodo.parse(req.body);
    try {
      return serializar(await db().comodo.update({ where: { id: params.id }, data: dados }));
    } catch (e) {
      if (nomeRepetido(e)) throw new ErroHttp(409, `Já existe um cômodo chamado "${dados.nome}".`);
      throw e;
    }
  });

  /** Só exclui cômodo vazio, para ninguém perder itens sem querer. */
  app.delete("/comodos/:id", async (req, reply) => {
    const params = id.parse(req.params);
    await exigirComodo(params.id, req.usuario.id);
    const itens = await db().item.count({ where: { comodoId: params.id } });
    if (itens > 0) {
      throw new ErroHttp(409, `Este cômodo tem ${itens} ${itens === 1 ? "item" : "itens"}. Mova ou exclua os itens antes.`);
    }
    await db().comodo.delete({ where: { id: params.id } });
    return reply.code(204).send();
  });
}
