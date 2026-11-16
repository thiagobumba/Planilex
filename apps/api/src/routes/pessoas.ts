import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirMembro } from "../acesso.js";
import { db } from "../db.js";
import { enviarEmailConvite, type ResultadoEmail } from "../emails.js";
import { ErroHttp, naoEncontrado, proibido } from "../erros.js";
import { exigirLogin, type Usuario } from "../plugins/autenticacao.js";

const idOrcamento = z.object({ id: z.uuid() });
const idConvite = z.object({ id: z.uuid() });
const idMembro = z.object({ id: z.uuid(), usuarioId: z.uuid() });
const dadosConvite = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Esse e-mail não parece válido." })),
});

/**
 * Chamado a cada GET /orcamentos: transforma os convites para o e-mail do
 * usuário em acesso ao orçamento (o convite é usado e apagado) e guarda o
 * e-mail nos acessos antigos que ainda não tinham.
 */
export async function aceitarConvites(usuario: Usuario, membrosSemEmail = true) {
  const email = usuario.email?.toLowerCase();
  if (!email) return;
  const convites = await db().convite.findMany({ where: { email } });
  // Sem convite pendente e sem e-mail a completar: nada a gravar (evita uma transação a cada página).
  if (convites.length === 0 && !membrosSemEmail) return;
  await db().$transaction([
    ...convites.map((c) =>
      db().membroOrcamento.upsert({
        where: { orcamentoId_usuarioId: { orcamentoId: c.orcamentoId, usuarioId: usuario.id } },
        create: { orcamentoId: c.orcamentoId, usuarioId: usuario.id, email, papel: "EDITOR" },
        update: {},
      }),
    ),
    ...(convites.length ? [db().convite.deleteMany({ where: { id: { in: convites.map((c) => c.id) } } })] : []),
    ...(membrosSemEmail ? [db().membroOrcamento.updateMany({ where: { usuarioId: usuario.id, email: null }, data: { email } })] : []),
  ]);
}

/** Formato do resultado do e-mail nas respostas da API. */
const respostaEmail = (r: ResultadoEmail) =>
  r.enviado ? { emailEnviado: true, tipoEmail: r.tipo } : { emailEnviado: false, motivoEmail: r.motivo };

async function exigirDono(orcamentoId: string, usuarioId: string) {
  const membro = await exigirMembro(orcamentoId, usuarioId);
  if (membro.papel !== "DONO") throw proibido();
  return membro;
}

/** Quem tem acesso ao orçamento e convites pendentes. Documentação: docs/api.md › Pessoas */
export async function rotasPessoas(app: FastifyInstance) {
  app.addHook("preHandler", exigirLogin);

  app.get("/orcamentos/:id/pessoas", async (req) => {
    const { id } = idOrcamento.parse(req.params);
    const eu = await exigirMembro(id, req.usuario.id);
    const [membros, convites] = await Promise.all([
      db().membroOrcamento.findMany({ where: { orcamentoId: id }, orderBy: [{ papel: "asc" }, { criadoEm: "asc" }] }),
      db().convite.findMany({ where: { orcamentoId: id }, orderBy: { criadoEm: "asc" } }),
    ]);
    return {
      podeGerenciar: eu.papel === "DONO",
      membros: membros.map((m) => ({
        usuarioId: m.usuarioId,
        email: m.email,
        papel: m.papel,
        voce: m.usuarioId === req.usuario.id,
      })),
      convites: convites.map((c) => ({ id: c.id, email: c.email, criadoEm: c.criadoEm.toISOString() })),
    };
  });

  app.post("/orcamentos/:id/convites", async (req, reply) => {
    const { id } = idOrcamento.parse(req.params);
    await exigirDono(id, req.usuario.id);
    const { email } = dadosConvite.parse(req.body);

    const jaMembro = await db().membroOrcamento.findFirst({ where: { orcamentoId: id, email } });
    if (jaMembro) throw new ErroHttp(409, `${email} já tem acesso a este orçamento.`);
    try {
      const convite = await db().convite.create({ data: { orcamentoId: id, email, convidadoPor: req.usuario.id } });
      const resultado = await enviarEmailConvite(email);
      return reply.code(201).send({
        id: convite.id,
        email: convite.email,
        criadoEm: convite.criadoEm.toISOString(),
        ...respostaEmail(resultado),
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") throw new ErroHttp(409, `${email} já foi convidado.`);
      throw e;
    }
  });

  app.post("/convites/:id/reenviar", async (req) => {
    const { id } = idConvite.parse(req.params);
    const convite = await db().convite.findUnique({ where: { id } });
    if (!convite) throw naoEncontrado("Convite");
    await exigirDono(convite.orcamentoId, req.usuario.id);
    return respostaEmail(await enviarEmailConvite(convite.email));
  });

  app.delete("/convites/:id", async (req, reply) => {
    const { id } = idConvite.parse(req.params);
    const convite = await db().convite.findUnique({ where: { id } });
    if (!convite) throw naoEncontrado("Convite");
    await exigirDono(convite.orcamentoId, req.usuario.id);
    await db().convite.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.delete("/orcamentos/:id/membros/:usuarioId", async (req, reply) => {
    const { id, usuarioId } = idMembro.parse(req.params);
    await exigirDono(id, req.usuario.id);
    if (usuarioId === req.usuario.id) throw new ErroHttp(409, "Você não pode tirar o seu próprio acesso.");
    const removidos = await db().membroOrcamento.deleteMany({ where: { orcamentoId: id, usuarioId } });
    if (removidos.count === 0) throw naoEncontrado("Pessoa");
    return reply.code(204).send();
  });
}
