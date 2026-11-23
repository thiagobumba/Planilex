/** De onde veio a oferta. */
export type FontePreco = "google" | "shopee";

/** Uma oferta encontrada numa das fontes de preço. */
export interface OfertaEncontrada {
  titulo: string;
  loja: string;
  preco: number;
  precoTexto: string;
  entrega: string | null;
  link: string;
  imagem: string | null;
  fonte: FontePreco;
}

/** Erro de uma fonte, já com a mensagem em português para mostrar no site. */
export class ErroFonte extends Error {
  constructor(
    public readonly fonte: FontePreco,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatarPreco = (v: number) => moeda.format(v);
export const centavos = (v: number) => Math.round(v * 100) / 100;
