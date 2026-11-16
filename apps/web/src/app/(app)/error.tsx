"use client";

import { useEffect } from "react";

/**
 * Aparece no lugar da página quando algo falha (por exemplo, a API fora do ar).
 * O menu, com o "Sair", continua visível porque fica no layout.
 */
export default function Erro({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="cartao" role="alert">
      <h1>Não foi possível carregar esta página</h1>
      <p className="suave">
        O site não conseguiu falar com a API do Planilex. Confira se o terminal com <code>npm run dev:api</code> está aberto e sem erros, e
        tente de novo.
      </p>
      <div className="acoes" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="botao botao-primario" onClick={() => retry()}>
          Tentar de novo
        </button>
      </div>
    </section>
  );
}
