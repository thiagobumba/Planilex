import { redirect } from "next/navigation";
import { criarClienteServidor } from "./supabase/servidor";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ErroApi extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/**
 * Chama a API do Planilex a partir do servidor do Next, enviando o token do
 * usuário logado. Sessão inválida → /login.
 */
export async function api<T>(rota: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const supabase = await criarClienteServidor();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${rota}`, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ErroApi(503, "A API não está respondendo. Ela está rodando? (npm run dev:api)");
  }

  if (resposta.status === 401) redirect("/login");
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string };
    throw new ErroApi(resposta.status, corpo.erro ?? "Algo deu errado. Tente de novo.");
  }
  return (resposta.status === 204 ? undefined : await resposta.json()) as T;
}
