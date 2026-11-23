import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "./generated/prisma/client.js";

/**
 * Backup do Planilex em JSON: o mesmo formato serve para o backup completo (todos os orçamentos,
 * `npm run db:backup`) e para o backup de um orçamento baixado em Configurações.
 * Documentação: docs/backup.md
 *
 * O que entra: orçamentos, pessoas com acesso (e-mail e papel), convites pendentes, cômodos,
 * itens, ofertas e histórico de preços. O que não entra: o cache das buscas de preço e o
 * registro de atividades, que se refazem sozinhos, e as contas de login (ficam no Supabase Auth).
 *
 * Na importação, os ids são novos e cada pessoa com acesso vira um convite com o mesmo papel:
 * quando ela entrar com o mesmo e-mail, recupera o acesso. Assim o backup funciona tanto no
 * mesmo projeto do Supabase quanto num projeto novo, onde os ids de usuário são outros.
 */

export const FORMATO_BACKUP = "planilex-backup";
export const VERSAO_BACKUP = 1;

/** Usado em `convidadoPor` dos convites criados por uma importação pelo terminal (sem usuário logado). */
export const USUARIO_IMPORTACAO = "00000000-0000-0000-0000-000000000000";

const dinheiro = z.number().min(0).max(9_999_999_999.99);
const voltagem = z.enum(["V127", "V220", "BIVOLT"]);
const papel = z.enum(["DONO", "EDITOR"]);
const dataIso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "data inválida");

const ofertaBackup = z.object({
  ref: z.string(),
  loja: z.string().min(1),
  titulo: z.string().min(1),
  preco: dinheiro,
  frete: dinheiro.default(0),
  total: dinheiro,
  url: z.string().min(1),
  voltagem: voltagem.nullable().default(null),
  consultadoEm: dataIso,
});

const itemBackup = z.object({
  nome: z.string().min(1),
  quantidade: z.number().int().min(1),
  situacao: z.enum(["PESQUISANDO", "CADASTRADO", "ESCOLHIDO", "COMPRADO"]),
  valorPrevisto: dinheiro.nullable(),
  valorPago: dinheiro.nullable(),
  alertaPreco: z.boolean().default(true),
  /** `ref` da oferta escolhida, dentro de `ofertas`. */
  ofertaEscolhida: z.string().nullable().default(null),
  criadoEm: dataIso,
  ofertas: z.array(ofertaBackup).default([]),
  historicoPrecos: z.array(z.object({ data: z.string(), menorPreco: dinheiro })).default([]),
});

const comodoBackup = z.object({
  nome: z.string().min(1),
  limite: dinheiro,
  ordem: z.number().int(),
  itens: z.array(itemBackup).default([]),
});

const orcamentoBackup = z.object({
  nome: z.string().min(1),
  valorTotal: dinheiro,
  reservaImprevistos: dinheiro,
  dataCasamento: z.string().nullable(),
  voltagemCasa: voltagem,
  cep: z.string().nullable(),
  criadoEm: dataIso,
  pessoas: z.array(z.object({ email: z.string().min(3), papel })).default([]),
  comodos: z.array(comodoBackup),
});

export const esquemaBackup = z.object({
  formato: z.literal(FORMATO_BACKUP),
  versao: z.number().int().max(VERSAO_BACKUP, { message: "Backup de uma versão mais nova do Planilex. Atualize o projeto antes de importar." }),
  criadoEm: dataIso,
  orcamentos: z.array(orcamentoBackup),
});

export type Backup = z.infer<typeof esquemaBackup>;
export type OrcamentoBackup = z.infer<typeof orcamentoBackup>;

/** "planilex-2026-11-23-1540.json" (hora local de quem roda). */
export function nomeArquivoBackup(quando = new Date()) {
  const d = (n: number) => String(n).padStart(2, "0");
  return `planilex-${quando.getFullYear()}-${d(quando.getMonth() + 1)}-${d(quando.getDate())}-${d(quando.getHours())}${d(quando.getMinutes())}.json`;
}

const num = (d: { toString(): string } | null) => (d == null ? null : Number(d.toString()));
const dia = (d: Date) => d.toISOString().slice(0, 10);

/** Gera o backup dos orçamentos indicados (ou de todos). */
export async function exportarBackup(prisma: PrismaClient, orcamentoIds?: string[]): Promise<Backup> {
  const orcamentos = await prisma.orcamento.findMany({
    where: orcamentoIds ? { id: { in: orcamentoIds } } : undefined,
    orderBy: { criadoEm: "asc" },
    include: {
      membros: { orderBy: { criadoEm: "asc" } },
      convites: { orderBy: { criadoEm: "asc" } },
      comodos: {
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        include: { itens: { orderBy: { criadoEm: "asc" }, include: { ofertas: { orderBy: { consultadoEm: "asc" } }, historicoPrecos: { orderBy: { data: "asc" } } } } },
      },
    },
  });

  return {
    formato: FORMATO_BACKUP,
    versao: VERSAO_BACKUP,
    criadoEm: new Date().toISOString(),
    orcamentos: orcamentos.map((o) => {
      // Pessoas com acesso e convites pendentes viram uma lista só de e-mails com papel.
      const pessoas = new Map<string, "DONO" | "EDITOR">();
      for (const m of o.membros) if (m.email) pessoas.set(m.email.toLowerCase(), m.papel);
      for (const c of o.convites) if (!pessoas.has(c.email)) pessoas.set(c.email, c.papel);
      return {
        nome: o.nome,
        valorTotal: num(o.valorTotal)!,
        reservaImprevistos: num(o.reservaImprevistos)!,
        dataCasamento: o.dataCasamento ? dia(o.dataCasamento) : null,
        voltagemCasa: o.voltagemCasa,
        cep: o.cep,
        criadoEm: o.criadoEm.toISOString(),
        pessoas: [...pessoas].map(([email, p]) => ({ email, papel: p })),
        comodos: o.comodos.map((c) => ({
          nome: c.nome,
          limite: num(c.limite)!,
          ordem: c.ordem,
          itens: c.itens.map((i) => ({
            nome: i.nome,
            quantidade: i.quantidade,
            situacao: i.situacao,
            valorPrevisto: num(i.valorPrevisto),
            valorPago: num(i.valorPago),
            alertaPreco: i.alertaPreco,
            ofertaEscolhida: i.ofertaEscolhidaId,
            criadoEm: i.criadoEm.toISOString(),
            ofertas: i.ofertas.map((of) => ({
              ref: of.id,
              loja: of.loja,
              titulo: of.titulo,
              preco: num(of.preco)!,
              frete: num(of.frete)!,
              total: num(of.total)!,
              url: of.url,
              voltagem: of.voltagem,
              consultadoEm: of.consultadoEm.toISOString(),
            })),
            historicoPrecos: i.historicoPrecos.map((h) => ({ data: dia(h.data), menorPreco: num(h.menorPreco)! })),
          })),
        })),
      };
    }),
  };
}

/** Valida o JSON lido de um arquivo. Erro com mensagem em português quando não serve. */
export function lerBackup(conteudo: unknown): Backup {
  const r = esquemaBackup.safeParse(conteudo);
  if (!r.success) {
    const p = r.error.issues[0];
    if (p.path[0] === "formato" || p.path[0] === "versao") throw new Error(p.path[0] === "formato" ? "Este arquivo não é um backup do Planilex." : p.message);
    const onde = p.path.length ? ` (campo ${p.path.join(".")})` : "";
    throw new Error(`Backup inválido: ${p.message}${onde}.`);
  }
  return r.data;
}

export interface OpcoesImportacao {
  /** Quem está importando pelo site: vira DONO na hora; os demais viram convites. */
  usuario?: { id: string; email?: string | null };
}

export interface ResultadoImportacao {
  orcamentos: { id: string; nome: string; comodos: number; itens: number; convites: number }[];
}

/**
 * Importa os orçamentos do backup como orçamentos novos (ids novos), numa transação:
 * ou entra tudo, ou nada. Nunca apaga nem altera o que já existe no banco.
 */
export async function importarBackup(prisma: PrismaClient, backup: Backup, opcoes: OpcoesImportacao = {}): Promise<ResultadoImportacao> {
  const emailUsuario = opcoes.usuario?.email?.toLowerCase() ?? null;
  return prisma.$transaction(
    async (tx) => {
      const resultado: ResultadoImportacao = { orcamentos: [] };
      for (const o of backup.orcamentos) {
        const novo = await tx.orcamento.create({
          data: {
            nome: o.nome,
            valorTotal: o.valorTotal,
            reservaImprevistos: o.reservaImprevistos,
            dataCasamento: o.dataCasamento ? new Date(o.dataCasamento) : null,
            voltagemCasa: o.voltagemCasa,
            cep: o.cep,
            criadoEm: new Date(o.criadoEm),
          },
        });

        if (opcoes.usuario) {
          await tx.membroOrcamento.create({
            data: { orcamentoId: novo.id, usuarioId: opcoes.usuario.id, email: emailUsuario, papel: "DONO" },
          });
        }
        const convidados = o.pessoas.filter((p) => p.email.toLowerCase() !== emailUsuario);
        if (convidados.length) {
          await tx.convite.createMany({
            data: convidados.map((p) => ({
              orcamentoId: novo.id,
              email: p.email.toLowerCase(),
              papel: p.papel,
              convidadoPor: opcoes.usuario?.id ?? USUARIO_IMPORTACAO,
            })),
            skipDuplicates: true,
          });
        }

        // Ids gerados aqui para inserir em lote (createMany): poucas idas ao banco, mesmo com o banco longe.
        const comodos: { id: string; orcamentoId: string; nome: string; limite: number; ordem: number }[] = [];
        const itensNovos: Prisma.ItemCreateManyInput[] = [];
        const ofertas: { id: string; itemId: string; loja: string; titulo: string; preco: number; frete: number; total: number; url: string; voltagem: "V127" | "V220" | "BIVOLT" | null; consultadoEm: Date }[] = [];
        const historico: { itemId: string; data: Date; menorPreco: number }[] = [];
        const escolhidas: { itemId: string; ofertaId: string }[] = [];
        for (const c of o.comodos) {
          const comodoId = randomUUID();
          comodos.push({ id: comodoId, orcamentoId: novo.id, nome: c.nome, limite: c.limite, ordem: c.ordem });
          for (const i of c.itens) {
            const itemId = randomUUID();
            itensNovos.push({
              id: itemId,
              comodoId,
              nome: i.nome,
              quantidade: i.quantidade,
              situacao: i.situacao,
              valorPrevisto: i.valorPrevisto,
              valorPago: i.situacao === "COMPRADO" ? i.valorPago : null,
              alertaPreco: i.alertaPreco,
              criadoEm: new Date(i.criadoEm),
            });
            for (const of of i.ofertas) {
              const ofertaId = randomUUID();
              ofertas.push({ id: ofertaId, itemId, loja: of.loja, titulo: of.titulo, preco: of.preco, frete: of.frete, total: of.total, url: of.url, voltagem: of.voltagem, consultadoEm: new Date(of.consultadoEm) });
              if (of.ref === i.ofertaEscolhida) escolhidas.push({ itemId, ofertaId });
            }
            for (const h of i.historicoPrecos) historico.push({ itemId, data: new Date(h.data), menorPreco: h.menorPreco });
          }
        }
        if (comodos.length) await tx.comodo.createMany({ data: comodos });
        if (itensNovos.length) await tx.item.createMany({ data: itensNovos });
        if (ofertas.length) await tx.oferta.createMany({ data: ofertas });
        if (historico.length) await tx.historicoPreco.createMany({ data: historico, skipDuplicates: true });
        for (const e of escolhidas) await tx.item.update({ where: { id: e.itemId }, data: { ofertaEscolhidaId: e.ofertaId } });
        const itens = itensNovos.length;
        resultado.orcamentos.push({ id: novo.id, nome: novo.nome, comodos: o.comodos.length, itens, convites: convidados.length });
      }
      return resultado;
    },
    // Um orçamento grande tem centenas de inserts; com o banco longe (~130 ms cada), 5 s não bastam.
    { timeout: 10 * 60_000, maxWait: 30_000 },
  );
}
