# Histórico de alterações

Todas as alterações do projeto são registradas aqui, da mais recente para a mais antiga.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada entrada informa:
- **O que mudou**: arquivos e funcionalidades afetados
- **Por quê**: motivo ou pedido que originou a mudança
- **Impacto**: o que muda para quem usa ou desenvolve (migrações, novas variáveis de ambiente, telas alteradas)

---

## [Não lançado]

### 2026-11-16 · Site não lia o `.env` da raiz
**Corrigido**
- A tela de login mostrava "O login ainda não está configurado" mesmo com o `.env` preenchido. O `@next/env` guarda em memória a primeira leitura de variáveis (a de `apps/web`, onde não há `.env`) e ignorava a segunda chamada, feita no `next.config.ts` para a raiz.
- `apps/web/next.config.ts`: recarrega com `forceReload` e repassa as variáveis `NEXT_PUBLIC_*` no campo `env`.

**Adicionado**
- `apps/web/AGENTS.md`: arquivo que o `next dev` cria e recria sozinho, com o aviso de que o Next 16 mudou APIs. Foi versionado para não aparecer como alteração pendente.

**Alterado**
- `docs/arquitetura.md`: explicação de como o site carrega o `.env` da raiz.

**Por quê:** erro encontrado no primeiro teste real no Windows. Nos testes anteriores as variáveis tinham sido passadas direto no terminal, o que escondia o problema.

**Impacto:** basta `git pull` e reiniciar o `npm run dev:web`. Verificado com um `.env` real na raiz, tanto em `next build` + `next start` quanto em `next dev`.

### 2026-11-16 · Login com Google e cadastro de orçamento, cômodos e itens
**Adicionado: API** (`apps/api`)
- Autenticação: toda rota (menos `/health*`) exige o token do Supabase em `Authorization: Bearer`, validado com `getClaims()` (`plugins/autenticacao.ts`).
- Controle de acesso: só membros do orçamento leem ou alteram os dados dele; para os outros, a resposta é 404 (`acesso.ts`).
- Rotas de orçamentos (`GET/POST /orcamentos`, `GET/PATCH /orcamentos/:id`, com o resumo do painel).
- Rotas de cômodos (`POST /orcamentos/:id/comodos`, `PATCH/DELETE /comodos/:id`).
- Rotas de itens (`GET /orcamentos/:id/itens` com filtros, `POST /itens`, `PATCH/DELETE /itens/:id`).
- Validação com zod e erros sempre no formato `{ "erro": "..." }`, em português.
- Regras de negócio:
  - "Comprado" exige valor pago;
  - cômodo com itens não pode ser excluído;
  - nome de cômodo único por orçamento;
  - item só pode ser movido para cômodo do mesmo orçamento.
- Testes de ponta a ponta (`test/api.test.ts`, 10 testes) e o comando `npm test -w @planilex/api`.
- Dependências: `@supabase/supabase-js` e `zod`.

**Adicionado: site** (`apps/web`)
- Login com Google (`/login`), callback do OAuth (`/auth/callback`) e saída (`/auth/sair`, por POST).
- `proxy.ts`: renova a sessão e protege todas as páginas.
- Painel: cartões de total, previsto, pago e disponível; barra de uso; aviso de cômodo acima do limite; cartões por cômodo. Sem orçamento, mostra o formulário de criação.
- Itens: formulário de adicionar, abas por cômodo, busca, filtro de situação, tabela com totais; página de edição com exclusão confirmada.
- Cômodos: editar nome e limite, criar, excluir cômodos vazios, soma dos limites comparada ao total.
- Configurações: editar os dados do orçamento.
- Ícone da aba (`icon.svg`).
- Dependências: `@supabase/ssr` e `@supabase/supabase-js`.

**Alterado**
- `apps/web/src/app/page.tsx` (página provisória) removida; o painel agora fica em `(app)/page.tsx`.
- `globals.css` reescrito com os estilos das telas, seguindo os modelos.
- `docs/api.md`: todas as rotas, convenções, regras de cálculo e como rodar os testes.
- `docs/arquitetura.md`:
  - decisão sobre o login com Google e o fluxo de autenticação;
  - nova estrutura de pastas;
  - regra dos valores dos itens.
- `docs/ux-8-regras.md`: o que de cada regra já está implementado e o que falta.
- `README.md`: seção "Login com Google", comando de testes, status e roadmap (etapa 3 concluída, com duas pendências).

**Por quê:** etapa 3 do roadmap. O login com Google foi a forma escolhida pelo dono do projeto.

**Impacto:**
- Exige o provedor Google ativo no Supabase, a URL de callback configurada e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env`; a API também lê essa chave.
- Não há migração nova de banco.
- Verificado:
  - typecheck e build de todos os pacotes;
  - 10 testes da API contra um PostgreSQL local;
  - navegação real no Chrome (sem rede, com o Supabase simulado): criar item, erro de valor inválido, criar cômodo, editar item, versão de celular e redirecionamentos de login.

### 2026-11-16 · Segurança: tabelas protegidas da Data API do Supabase
**Adicionado**
- Migração `20261116130000_ativa_rls`: ativa o Row Level Security, sem políticas, em todas as tabelas (`orcamentos`, `membros_orcamento`, `comodos`, `itens`, `ofertas`, `historico_precos`, `atividades` e `_prisma_migrations`).
- `CLAUDE.md`: nova seção "Banco de dados", com a regra de ativar o RLS em toda tabela nova.
- `docs/arquitetura.md`: decisão "Dados acessados só pela nossa API" e a migração na tabela de migrações.

**Por quê:** depois do primeiro `db:deploy`, o painel do Supabase marcou todas as tabelas como **UNRESTRICTED**. Isso quer dizer que qualquer pessoa com a chave pública (que fica visível no navegador) poderia ler e alterar os dados pela Data API do Supabase.

**Impacto:**
- É preciso rodar `npm run db:deploy` para aplicar a migração.
- A API do Planilex continua funcionando, porque conecta como `postgres`, que não é afetado pelo RLS.
- A Data API do Supabase deixa de devolver ou alterar dados dessas tabelas.

### 2026-11-16 · API não subia: pacote do banco não era compilado
**Corrigido**
- `npm run dev:api` falhava com `ERR_MODULE_NOT_FOUND ... @planilex/db/dist/index.js`, porque a API importa a versão compilada do pacote do banco e nada a gerava antes.

**Alterado** (`package.json` da raiz)
- Novo `postinstall`: o `npm install` gera o cliente do Prisma e compila `@planilex/db`.
- `dev:api` compila `@planilex/db` antes de subir a API.
- `db:generate` passa a compilar o pacote inteiro, não só gerar o cliente.
- `db:migrate` recompila o pacote depois de criar a migração.
- `README.md`: descrições dos comandos atualizadas.

**Por quê:** erro encontrado ao rodar a API pela primeira vez no Windows.

**Impacto:** basta `git pull` seguido de `npm install`. Testado a partir de uma pasta limpa: a instalação gera `packages/db/dist` e a API sobe e responde em `/health`.

### 2026-11-16 · Autorização dos scripts de instalação (npm 11/12)
**Adicionado**
- `package.json`: campo `allowScripts` autorizando os scripts de instalação de `prisma`, `@prisma/engines` e `esbuild`.
- `README.md`: explicação do `allowScripts` e de como resolver o `git pull` bloqueado pelo `package-lock.json`.

**Por quê:** o npm 11 passou a avisar sobre scripts de instalação não revisados, e o npm 12 os bloqueia. Sem esses scripts, os motores do Prisma e o `esbuild` (usado pelo `tsx`) podem não ser instalados.

**Impacto:** o aviso `install-scripts` some no `npm install`. Versões mais antigas do npm ignoram o campo.

### 2026-11-16 · Comando para diagnosticar a conexão com o banco
**Adicionado**
- `packages/db/scripts/testar-conexao.mjs` e o comando `npm run db:testar`: testa `DATABASE_URL` e `DIRECT_URL` separadamente e mostra a mensagem exata do servidor, com a senha mascarada.
- Dependência `pg` no pacote `@planilex/db` (usada pelo script; já vinha junto do `@prisma/adapter-pg`).
- `README.md`: o novo comando na tabela de comandos e a seção "Problemas de conexão com o banco", com as causas mais comuns.

**Por quê:** o `prisma migrate deploy` falhou com `P1001: Can't reach database server`, apesar de as portas 5432 e 6543 estarem acessíveis. Esse erro do Prisma é genérico e esconde o motivo real.

**Impacto:** nenhum no app. Novo comando de diagnóstico para quem configura o `.env`.

### 2026-11-16 · Estrutura do projeto: site, API e banco
**Adicionado**
- `package.json` na raiz com npm workspaces e os comandos `dev:web`, `dev:api`, `build`, `typecheck` e `db:*`.
- `apps/web`: site em Next.js 16 com TypeScript; página inicial provisória; `globals.css` com as cores e fontes dos modelos de telas.
- `apps/api`: API em Fastify 5 com TypeScript, CORS liberado para o site e as rotas `GET /health` e `GET /health/banco`.
- `packages/db`: pacote `@planilex/db` com Prisma 7, `schema.prisma` com o modelo de dados completo (orçamentos, membros, cômodos, itens, ofertas, histórico de preços, atividades) e a função `criarPrisma()`.
- Migração `20261116120000_inicial`, que cria todas as tabelas.
- `.env.example` com todas as variáveis e onde encontrá-las no Supabase.
- `.gitignore` (dependências, builds, `.env`, cliente gerado do Prisma), `.nvmrc` (Node 22) e `tsconfig.base.json`.
- `docs/api.md`: documentação das rotas da API.

**Alterado**
- `README.md`: instruções para rodar o projeto, tabela de variáveis de ambiente e de comandos; roadmap com a etapa 2 concluída.
- `docs/arquitetura.md`: estrutura real das pastas, modelo de dados detalhado, tabela de migrações e a decisão sobre monorepo e Prisma 7.

**Por quê:** etapa 2 do roadmap, preparar a base do código enquanto o projeto no Supabase é criado.

**Impacto:**
- Quem for rodar o projeto precisa criar o `.env` a partir do `.env.example` e executar `npm install` e `npm run db:deploy`.
- Verificado: instalação, geração do cliente Prisma, build da API, do banco e do site sem erros; `/health` responde `ok` e `/health/banco` responde 503 enquanto o `.env` não estiver preenchido.

### 2026-11-16 · Decisão: banco no Supabase
**Alterado**
- `docs/arquitetura.md`: hospedagem do banco definida como Supabase (PostgreSQL + Auth); nova seção "Decisões" com as alternativas consideradas e os cuidados.
- `README.md`: stack atualizada.

**Por quê:** projeto pessoal e simples, com o orçamento compartilhado entre mais de uma pessoa. O login pronto do Supabase evita construir autenticação do zero.

**Impacto:** quando o código começar, será preciso criar um projeto no Supabase e configurar as variáveis de conexão (a lista vai para o README nessa etapa).

### 2026-11-16 · Regras de documentação
**Adicionado**
- `CHANGELOG.md`: este histórico de alterações.
- `CLAUDE.md`: regras do projeto, incluindo a obrigação de documentar toda alteração.

**Por quê:** pedido do dono do projeto, para que toda alteração gere documentação.

**Impacto:** nenhum no app. Daqui em diante, todo commit atualiza este arquivo e, quando for o caso, os documentos em `docs/`.

### 2026-11-16 · Documentação inicial e modelos de telas
**Adicionado**
- `README.md`: visão geral, telas e roadmap.
- `docs/arquitetura.md`: stack (Next.js, Fastify, PostgreSQL + Prisma), estrutura do repositório e rascunho do modelo de dados.
- `docs/ux-8-regras.md`: aplicação das 8 regras de ouro do Shneiderman.
- `docs/design/`: fontes dos 5 modelos de telas (Painel, Buscar preços, Adicionar ao orçamento, Itens, Celular).

**Por quê:** fase de planejamento, antes de qualquer código.

**Impacto:** nenhum código da aplicação ainda.
