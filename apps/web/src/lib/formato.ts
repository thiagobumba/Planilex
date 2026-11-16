import type { Situacao, Voltagem } from "./tipos";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaInteira = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** R$ 1.234,56 */
export const reais = (v: number | null | undefined) => (v == null ? "—" : moeda.format(v));
/** R$ 1.235 (para cartões e totais grandes) */
export const reaisInteiros = (v: number) => moedaInteira.format(v);

export const NOMES_SITUACAO: Record<Situacao, string> = {
  PESQUISANDO: "Pesquisando",
  CADASTRADO: "Cadastrado",
  ESCOLHIDO: "Escolhido",
  COMPRADO: "Comprado",
};

export const NOMES_VOLTAGEM: Record<Voltagem, string> = {
  V127: "127 V",
  V220: "220 V",
  BIVOLT: "Bivolt",
};

/** "Casamento em 18/04/2027 · faltam 153 dias" */
export function textoContagem(dataCasamento: string | null) {
  if (!dataCasamento) return null;
  const [a, m, d] = dataCasamento.split("-").map(Number);
  const alvo = Date.UTC(a, m - 1, d);
  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((alvo - hojeUtc) / 86_400_000);
  const data = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
  if (dias > 1) return `Casamento em ${data} · faltam ${dias} dias`;
  if (dias === 1) return `Casamento em ${data} · é amanhã`;
  if (dias === 0) return `Casamento em ${data} · é hoje`;
  return `Casamento em ${data}`;
}

/** Converte "1.234,56", "1234,56" ou "1234.56" em número. Vazio vira null. */
export function lerValor(texto: FormDataEntryValue | null): number | null {
  const s = String(texto ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const normalizado = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}
