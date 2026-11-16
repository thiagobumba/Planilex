/** Qualquer valor DECIMAL vindo do Prisma (tem toString com o número exato). */
type Decimal = { toString(): string };

/** Converte valores DECIMAL do banco para número (em reais, com centavos). */
export const num = (v: Decimal | null | undefined): number | null => (v == null ? null : Number(v.toString()));

/** Arredonda para centavos, evitando erros de soma com ponto flutuante. */
export const centavos = (v: number) => Math.round(v * 100) / 100;
