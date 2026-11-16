import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirMembro } from "../acesso.js";
import { db } from "../db.js";
import { centavos, num } from "../formatos.js";
import { exigirLogin } from "../plugins/autenticacao.js";
import { percentual, resumoItens } from "../resumo.js";
import type { Usuario } from "../plugins/autenticacao.js";
import { aceitarConvites } from "./pessoas.js";

/** Cômodos criados junto com um orçamento novo (podem ser editados depois). */
export const COMODOS_PADRAO = ["Cozinha", "Sala", "Quarto", "Banheiro", "Área de serviço", "Materiais e obra"];

const dinheiro = z.coerce.number().min(0, "O valor não pode ser negativo.").max(9_999_999_999.99);
const voltagem = z.enum(["V127", "V220", "BIVOLT"]);
const data = z.iso.date({ message: "Use o formato AAAA-MM-DD." });

const criarOrcamento = z.object({
  nome: z.string().trim().min(1, "Informe um nome.").max(120),
  valorTotal: dinheiro,
  reservaImprevistos: dinheiro.optional(),
  dataCasamento: data.nullish(),
  voltagemCasa: voltagem.optional(),
  cep: z.string().trim().max(9).nullish(),
  comodosPadrao: z.boolean().default(true),
});

const editarOrcamento = criarOrcamento.omit({ comodosPadrao: true }).partial();
const params = z.object({ id: z.uuid() });

function serializarOrcamento(o: {
  id: string;
  nome: string;
  valorTotal: { toString(): string };
  reservaImprevistos: { toString(): string };
  dataCasamento: Date | null;
  voltagemCasa: string;
  cep: string | null;
}) {
  return {
    id: o.id,
    nome: o.nome,
    valorTotal: num(o.valorTotal)!,
    reservaImprevistos: num(o.reservaImprevistos)!,
    dataCasamento: o.dataCasamento ? o.dataCasamento.toISOString().slice(0, 10) : null,
    voltagemCasa: o.voltagemCasa,
    cep: o.cep,
  };
}

/** Rotas de orçamento. Documentação: docs/api.md › Orçamentos */
export async function rotasOrcamentos(app: FastifyInstance) {
  app.addHook("preHandler", exigirLogin);

  app.get("/orcamentos", async (req) => {
    const membros = await membrosDoUsuario(req.usuario);
    return membros.map((m) => ({ ...serializarOrcamento(m.orcamento), papel: m.papel }));
  });

  /**
   * Orçamento em uso (o primeiro do usuário) já com o resumo do painel.
   * Junta GET /orcamentos e GET /orcamentos/:id numa chamada só. Sem orçamento: 204.
   */
  app.get("/orcamentos/atual", async (req, reply) => {
    const membros = await membrosDoUsuario(req.usuario);
    if (membros.length === 0) return reply.code(204).send();
    return detalhar(membros[0].orcamentoId, membros[0].papel);
  });

  app.post("/orcamentos", async (req, reply) => {
    const dados = criarOrcamento.parse(req.body);
    const orcamento = await db().orcamento.create({
      data: {
        nome: dados.nome,
        valorTotal: dados.valorTotal,
        reservaImprevistos: dados.reservaImprevistos ?? 0,
        dataCasamento: dados.dataCasamento ? new Date(dados.dataCasamento) : null,
        voltagemCasa: dados.voltagemCasa,
        cep: dados.cep ?? null,
        membros: { create: { usuarioId: req.usuario.id, email: req.usuario.email?.toLowerCase() ?? null, papel: "DONO" } },
        comodos: dados.comodosPadrao
          ? { create: COMODOS_PADRAO.map((nome, ordem) => ({ nome, ordem })) }
          : undefined,
      },
    });
    return reply.code(201).send(serializarOrcamento(orcamento));
  });

  /** Orçamento com o resumo do painel: totais e uso por cômodo. */
  app.get("/orcamentos/:id", async (req) => {
    const { id } = params.parse(req.params);
    const membro = await exigirMembro(id, req.usuario.id);
    return detalhar(id, membro.papel);
  });

  app.patch("/orcamentos/:id", async (req) => {
    const { id } = params.parse(req.params);
    await exigirMembro(id, req.usuario.id);
    const dados = editarOrcamento.parse(req.body);
    const orcamento = await db().orcamento.update({
      where: { id },
      data: {
        ...dados,
        cep: dados.cep === undefined ? undefined : dados.cep,
        dataCasamento:
          dados.dataCasamento === undefined ? undefined : dados.dataCasamento ? new Date(dados.dataCasamento) : null,
      },
    });
    return serializarOrcamento(orcamento);
  });
}

/** Convites pendentes e e-mails a completar são resolvidos aqui; depois devolve os orçamentos do usuário. */
async function membrosDoUsuario(usuario: Usuario) {
  const buscar = () =>
    db().membroOrcamento.findMany({ where: { usuarioId: usuario.id }, include: { orcamento: true }, orderBy: { criadoEm: "asc" } });
  const email = usuario.email?.toLowerCase();
  const [membros, convitesPendentes] = await Promise.all([buscar(), email ? db().convite.count({ where: { email } }) : 0]);
  const semEmail = Boolean(email) && membros.some((m) => !m.email);
  if (convitesPendentes === 0 && !semEmail) return membros;
  await aceitarConvites(usuario, semEmail);
  return buscar();
}

/** Orçamento com o resumo do painel: totais e uso por cômodo (uma consulta só, com JOIN). */
async function detalhar(id: string, papel: string) {
  const orcamento = await db().orcamento.findUniqueOrThrow({
    where: { id },
    include: {
      comodos: {
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        include: { itens: { select: { situacao: true, valorPrevisto: true, valorPago: true } } },
      },
    },
  });

  const comodos = orcamento.comodos.map((c) => {
    const r = resumoItens(c.itens);
    const limite = num(c.limite)!;
    return {
      id: c.id,
      nome: c.nome,
      limite,
      ordem: c.ordem,
      ...r,
      percentualDoLimite: percentual(r.previsto, limite),
      acimaDoLimite: limite > 0 && r.previsto > limite,
      excedente: limite > 0 && r.previsto > limite ? centavos(r.previsto - limite) : 0,
    };
  });

  const total = resumoItens(orcamento.comodos.flatMap((c) => c.itens));
  const valorTotal = num(orcamento.valorTotal)!;
  return {
    ...serializarOrcamento(orcamento),
    papel,
    resumo: {
      ...total,
      aPagar: centavos(total.previsto - total.pago),
      disponivel: centavos(valorTotal - total.previsto),
      percentualPrevisto: percentual(total.previsto, valorTotal),
      percentualPago: percentual(total.pago, valorTotal),
    },
    comodos,
  };
}
