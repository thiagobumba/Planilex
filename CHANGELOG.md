# Histórico de alterações

Todas as alterações do projeto são registradas aqui, da mais recente para a mais antiga.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada entrada informa:
- **O que mudou**: arquivos e funcionalidades afetados
- **Por quê**: motivo ou pedido que originou a mudança
- **Impacto**: o que muda para quem usa ou desenvolve (migrações, novas variáveis de ambiente, telas alteradas)

---

## [Não lançado]

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
