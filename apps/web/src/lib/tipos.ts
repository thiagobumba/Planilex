/** Formatos devolvidos pela API (ver docs/api.md). */

export type Voltagem = "V127" | "V220" | "BIVOLT";
export type Situacao = "PESQUISANDO" | "ESCOLHIDO" | "COMPRADO";

export interface Orcamento {
  id: string;
  nome: string;
  valorTotal: number;
  reservaImprevistos: number;
  dataCasamento: string | null;
  voltagemCasa: Voltagem;
  cep: string | null;
  papel: "DONO" | "EDITOR";
}

export interface ResumoComodo {
  id: string;
  nome: string;
  limite: number;
  ordem: number;
  previsto: number;
  pago: number;
  quantidadeItens: number;
  quantidadeComprados: number;
  percentualDoLimite: number;
  acimaDoLimite: boolean;
  excedente: number;
}

export interface OrcamentoDetalhado extends Orcamento {
  resumo: {
    previsto: number;
    pago: number;
    aPagar: number;
    disponivel: number;
    quantidadeItens: number;
    quantidadeComprados: number;
    percentualPrevisto: number;
    percentualPago: number;
  };
  comodos: ResumoComodo[];
}

export interface Item {
  id: string;
  nome: string;
  comodoId: string;
  comodo?: string;
  quantidade: number;
  situacao: Situacao;
  valorPrevisto: number | null;
  valorPago: number | null;
  alertaPreco: boolean;
  atualizadoEm: string;
  ofertaEscolhida: OfertaEscolhida | null;
}

/** Oferta encontrada na busca de preços (Google Shopping via SerpApi). */
export interface OfertaEncontrada {
  titulo: string;
  loja: string;
  preco: number;
  precoTexto: string;
  entrega: string | null;
  link: string;
  imagem: string | null;
}

export interface ResultadoBusca {
  termo: string;
  consultadoEm: string;
  emCache: boolean;
  ofertas: OfertaEncontrada[];
}

/** Oferta ligada a um item (o "melhor preço" escolhido). */
export interface OfertaEscolhida {
  loja: string;
  titulo: string;
  preco: number | null;
  link: string;
  consultadoEm: string;
}

export interface Pessoas {
  podeGerenciar: boolean;
  membros: { usuarioId: string; email: string | null; papel: "DONO" | "EDITOR"; voce: boolean }[];
  convites: { id: string; email: string; criadoEm: string }[];
}

/** Resultado do envio do e-mail do convite. */
export interface ResultadoEmailConvite {
  emailEnviado: boolean;
  tipoEmail?: "convite" | "link";
  motivoEmail?: string;
}

/** Resultado das server actions, mostrado no formulário. */
export interface EstadoAcao {
  erro?: string;
  ok?: string;
  /** Aviso amarelo: deu certo, mas com uma ressalva. */
  atencao?: string;
  /** Muda a cada sucesso; usado para limpar o formulário. */
  vez?: number;
}
