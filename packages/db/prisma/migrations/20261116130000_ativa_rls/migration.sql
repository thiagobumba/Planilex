-- Ativa o Row Level Security (RLS) em todas as tabelas, sem nenhuma política.
--
-- Por quê: o Supabase expõe as tabelas do schema "public" pela Data API
-- (REST/GraphQL), acessível com a chave pública (anon), que fica visível no
-- navegador. Sem RLS, qualquer pessoa com essa chave poderia ler e alterar
-- todos os dados.
--
-- Com RLS ativo e sem políticas, a Data API não devolve nem altera nada.
-- A API do Planilex conecta com o usuário "postgres" (dono das tabelas),
-- que ignora o RLS, então continua funcionando normalmente.

ALTER TABLE "orcamentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membros_orcamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comodos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "itens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ofertas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "historico_precos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "atividades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
