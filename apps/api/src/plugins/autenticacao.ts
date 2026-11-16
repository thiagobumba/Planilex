import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export interface Usuario {
  id: string;
  email?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    usuario: Usuario;
  }
}

let supabase: SupabaseClient | undefined;

function clienteSupabase(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar no .env");
  }
  supabase ??= createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

type VerificadorDeToken = (token: string) => Promise<Usuario | null>;

/** Confere a assinatura do token com as chaves públicas do projeto no Supabase. */
const verificarComSupabase: VerificadorDeToken = async (token) => {
  const { data, error } = await clienteSupabase().auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: data.claims.email as string | undefined };
};

let verificador: VerificadorDeToken = verificarComSupabase;

/** Usado só nos testes automatizados, para não depender do Supabase. */
export function definirVerificadorDeToken(novo: VerificadorDeToken) {
  verificador = novo;
}

/**
 * Exige o token de acesso do Supabase em `Authorization: Bearer <token>`.
 * Documentação: docs/api.md › Autenticação
 */
export async function exigirLogin(req: FastifyRequest, reply: FastifyReply) {
  const cabecalho = req.headers.authorization ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
  if (!token) {
    return reply.code(401).send({ erro: "Faça login para continuar." });
  }

  const usuario = await verificador(token);
  if (!usuario) {
    return reply.code(401).send({ erro: "Sessão inválida ou expirada. Faça login de novo." });
  }
  req.usuario = usuario;
}
