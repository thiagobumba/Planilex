/** Erro com código HTTP e mensagem para quem chamou a API. */
export class ErroHttp extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export const naoEncontrado = (o = "Registro") => new ErroHttp(404, `${o} não encontrado.`);
export const proibido = () => new ErroHttp(403, "Você não tem permissão para esta ação.");
