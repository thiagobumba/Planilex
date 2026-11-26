# Handoff técnico: Planilex

Resumo para quem for continuar o projeto, pessoa ou agente. Estado em **2026-11-25**, commit `11f94e9`.

Os detalhes ficam nos documentos de cada assunto (links ao longo do texto). Este arquivo diz o que existe, onde está e o que falta.

---

## 1. O produto

O **Planilex** é um app web pessoal em pt-BR para prever e controlar os gastos do casamento e da montagem da casa (móveis, eletrodomésticos e materiais), organizado por cômodo.

- **Orçamento compartilhado:** todo mundo com acesso vê e edita o mesmo orçamento, e o acesso é dado por convite por e-mail.
- **Cômodos com limite de gasto:** o painel mostra os cômodos como a planta da casa.
- **Itens:** cada item tem situação (Pesquisando, Cadastrado, Escolhido ou Comprado), valor previsto e valor pago. A lista é separada nas guias "Falta comprar" e "Comprados".
- **Busca de preços:** consulta Google Shopping (pelo SerpApi) e Shopee ao mesmo tempo, com filtro por marca, cache de 24 h e paginação.
- **Backup:** automático diário, mais importação para instalações novas.
- **Usuários:** o casal (o dono, Thiago, e quem ele convidar). O app roda **no computador do dono (Windows)**, em modo de desenvolvimento, e ainda não foi publicado na internet.

## 2. Stack e estrutura

Monorepo com npm workspaces, Node 22 ou mais novo (o dono usa Node 26) e TypeScript.

| Parte | Pasta | Tecnologia |
|-------|-------|------------|
| Site | `apps/web` | Next.js 16 (App Router, `proxy.ts` no lugar do middleware, `searchParams` e `params` assíncronos), server actions, CSS puro em `globals.css` |
| API | `apps/api` | Fastify 5, zod v4, tsx; porta 3333 |
| Banco | `packages/db` (`@planilex/db`) | Prisma 7.10 com `prisma.config.ts` e `@prisma/adapter-pg`, ESM. Preview `relationJoins` ligado |
| Banco e login | Supabase | Postgres na região us-east-1 e Supabase Auth (Google e e-mail/senha) |

```
apps/web/src/
  proxy.ts                  renova a sessão e manda para /login quem não está logado
  app/login, app/auth/*     entrada, callback do Google, link do e-mail, nova senha
  app/(app)/                telas logadas: painel (page.tsx), itens, itens/[id], comodos, configuracoes
  app/(app)/acoes.ts        server actions: todas chamam a API com o token do usuário
  components/               CamposItem (busca de preços, Comprado Sim/Não), Menu, Logo, Formulario…
  lib/                      api.ts (fetch com o token), dados.ts (orcamentoAtual), tipos.ts, formato.ts
apps/api/src/
  routes/                   saude, orcamentos, comodos, itens, pessoas, precos, backup
  fontes/                   google.ts (SerpApi), shopee.ts (afiliados), tipos.ts
  precos.ts                 junta as fontes, filtra a marca, esconde acessórios e guarda o cache
  backupAutomatico.ts       backup diário em backups/
  plugins/autenticacao.ts   confere o token do Supabase (getClaims) e guarda o token conferido até expirar
  acesso.ts                 exigirMembro, exigirComodo e exigirItem: 404 para quem não é membro
packages/db/
  prisma/schema.prisma, prisma/migrations/
  src/backup.ts             formato, exportação e importação de backup
  scripts/                  testar-conexao.mjs, backup.mjs, importar.mjs
scripts/planilex-automatico.ps1, *.cmd   modo automático e atalhos do Windows (CRLF)
docs/                       arquitetura, api, backup, ux-8-regras, design/
```

## 3. Como roda no computador do dono

- **Modo automático (o que o dono usa):** `iniciar-planilex.cmd` chama `scripts/planilex-automatico.ps1`. O script sobe a API e o site e consulta o GitHub a cada 30 s. Quando chega commit novo, ele faz `git pull` e:
  - roda `npm install` se `package*.json` ou `next.config.ts` mudou, e reinicia a API e o site;
  - recompila o pacote do banco se `packages/db` mudou;
  - aplica migrações novas com `db:deploy`.
  - **Consequência:** todo push chega no banco real do dono em cerca de 30 s.
- **Atalhos manuais:** `iniciar-api.cmd` (aplica migrações e sobe a API) e `atualizar-e-iniciar-site.cmd` (pull, install, `db:deploy` e site).
- **Endereços:** site em http://localhost:3000, API em http://localhost:3333 (`/health` e `/health/banco`).
- **Modo de produção do site:** `npm run site:rapido`, mais rápido, mas sem recarregar sozinho.

Principais comandos (todos estão no README › Comandos):
- `db:deploy` · `db:migrate` · `db:testar`;
- `db:backup` · `db:importar -- arquivo.json`;
- `precos:testar` (SerpApi) · `shopee:testar`;
- `npm test -w @planilex/api` (precisa de `TEST_DATABASE_URL`).

## 4. Variáveis de ambiente (`.env` na raiz)

Lista completa em `.env.example` e no README. O `.env` **nunca** vai para o git, e o repositório é **público**.

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` / `DIRECT_URL` | Pooler de transação na porta 6543 com `?pgbouncer=true`, usado pela API; pooler de sessão na porta 5432, usado pelas migrações |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Login (chave publicável) |
| `SUPABASE_SECRET_KEY` | Opcional. Envio do e-mail de convite pelo Supabase Auth |
| `SERPAPI_KEY` | Busca no Google Shopping |
| `SHOPEE_APP_ID` / `SHOPEE_APP_SECRET` | Busca na Shopee (API de afiliados) |
| `BACKUP_AUTOMATICO` / `BACKUP_PASTA` / `BACKUP_MANTER` | Backup diário (padrão: ligado, `backups/`, 30) |
| `API_PORT`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` | Portas e CORS |

## 5. Dados

Modelos: `Orcamento`, `MembroOrcamento` (DONO ou EDITOR, com e-mail), `Convite` (e-mail e papel), `Comodo` (limite), `Item` (situação, previsto, pago, `ofertaEscolhidaId`), `Oferta`, `HistoricoPreco`, `BuscaPreco` (cache de 24 h) e `Atividade` (criada, mas ainda sem uso).

Migrações, todas só aditivas:
1. `20261116120000_inicial`
2. `…130000_ativa_rls`
3. `…140000_convites`
4. `…150000_buscas_preco`
5. `…160000_situacao_cadastrado`
6. `20261123150000_convite_papel`

**Regras do banco (CLAUDE.md):**
- **RLS ativo sem políticas** em toda tabela, na mesma migração que a cria. Assim a Data API do Supabase fica bloqueada, e só a API acessa os dados, como `postgres`, pelo Prisma.
- Uma migração que **apague dados** só pode ser enviada depois de avisar e ter a **confirmação do dono**, porque o modo automático aplica sozinho no banco real.

## 6. API

Rotas documentadas em `docs/api.md`. Todas exigem `Authorization: Bearer <token do Supabase>`, menos `/health*`.

- `GET /orcamentos/atual`: orçamento com o resumo numa chamada só, usado em toda tela. Também aceita os convites pendentes.
- Orçamentos: `GET/POST /orcamentos`, `GET/PATCH /orcamentos/:id`.
- Cômodos e itens: `POST /orcamentos/:id/comodos`, `PATCH/DELETE /comodos/:id`, `GET /orcamentos/:id/itens`, `GET /itens/:id`, `POST /itens`, `PATCH/DELETE /itens/:id`. O item aceita `oferta`, que grava a oferta escolhida e o histórico do dia.
- Pessoas: `GET /orcamentos/:id/pessoas`, `POST /orcamentos/:id/convites`, `POST /convites/:id/reenviar`, `DELETE /convites/:id`, `DELETE /orcamentos/:id/membros/:usuarioId`. Só o DONO convida ou remove.
- Busca: `GET /precos?q=&marca=&atualizar=1`, que responde `{ ofertas, fontes, avisos, ocultas, marca, marcaSemResultado, emCache }`.
- Backup: `GET /orcamentos/:id/backup` e `POST /orcamentos/importar`.

## 7. Decisões que valem saber

| Decisão | Motivo | Onde |
|---------|--------|------|
| Fluxos de login | Google por PKCE (`/auth/callback`); convite e link mágico pelo fluxo implícito (`/auth/link`) | `docs/arquitetura.md` › Decisões |
| Um orçamento por pessoa | O site usa o primeiro orçamento do usuário | `lib/dados.ts` |
| Valores no item | São o **total** do item, já com a quantidade. `COMPRADO` exige valor pago | `routes/itens.ts` |
| "Comprado? Sim/Não" | É a situação `COMPRADO`, sem coluna própria | `CamposItem.tsx` |
| Desempenho | O banco fica longe (~130 ms por consulta): poucas consultas por tela, relationJoins e token guardado na memória | `docs/arquitetura.md` › Desempenho |
| Busca de preços | As fontes rodam em paralelo (`Promise.allSettled`); uma falha vira aviso. Busca com falha não é guardada. Acessórios (abaixo de 25% da mediana) são escondidos | `precos.ts` |
| Backup | JSON próprio e versionado, em vez de `pg_dump`. Na importação, as pessoas viram convites com o mesmo papel | `docs/backup.md` |
| Identidade visual | **G · Planta baixa**: IBM Plex, azul-marinho `#13294B`, cantos retos, painel em planta | `globals.css` (tokens no topo), `docs/design/estilos/` |
| UX | As 8 regras de Shneiderman e a revisão pelas diretrizes da Apple (contraste e alvos de 44 px) | `docs/ux-8-regras.md` |

## 8. Convenções obrigatórias (CLAUDE.md)

- **Toda alteração** leva uma entrada no `CHANGELOG.md` ("[Não lançado]", com data, o que mudou, por quê e impacto) e a atualização do documento afetado em `docs/` e no README, **no mesmo commit**.
- Commit e push de tudo; mensagens em português; `git pull` antes de começar.
- Tudo em pt-BR: interface, documentação e commits.
- Mudança em `scripts/planilex-automatico.ps1` só vale depois que o dono reabre o script, e é preciso avisá-lo.
- Arquivos `.cmd` e `.ps1` usam CRLF (`.gitattributes`).

## 9. Testes

- **API:** 20 testes de ponta a ponta em `apps/api/test/api.test.ts`, contra um Postgres de teste, com o SerpApi e a Shopee simulados. A Shopee simulada confere a assinatura.
- **Site:** não há testes automatizados no repositório. As verificações foram feitas com Puppeteer fora dele.
- **Ambiente de teste usado nesta sessão** (fora do repositório, não persiste):
  - Postgres 16 local;
  - Supabase Auth simulado (JWKS), que gera um cookie de sessão;
  - SerpApi simulado;
  - scripts Puppeteer para os fluxos de cadastro, compra, busca e importação.
  - Para recriar: subir um Postgres, rodar `db:deploy` e apontar `TEST_DATABASE_URL`.

## 10. Pendências

**Do lado do dono (configuração):**
- **Redefinir segredos que apareceram no chat:**
  - a Senha da API de afiliados da Shopee (affiliate.shopee.com.br › Abrir API › Redefinir);
  - a senha do banco e o *client secret* do Google, que também tinham aparecido antes;
  - depois, atualizar o `.env` e rodar `npm run shopee:testar`.
- **Mercado Livre:** o pedido de acesso à API oficial está em análise. Quando sair, entram `ML_CLIENT_ID` e `ML_CLIENT_SECRET` no `.env`. A fonte ainda **não foi implementada**: falta o OAuth, com renovação do token e escopo de leitura mais `offline_access`. A aplicação "AppThiago" do **Mercado Pago** não serve para isso.
- **E-mail do convite:** SMTP próprio no Supabase (senha de app do Gmail) e `SUPABASE_SECRET_KEY`. Sem isso, o e-mail só chega para membros do time do projeto no Supabase.
- **Cópia do backup fora do computador:** apontar `BACKUP_PASTA` para o Google Drive, por exemplo.

**No código (roadmap):**
- "Desfazer" depois de excluir ou alterar: a tabela `atividades` existe, mas não é usada.
- Filtro pela voltagem da casa na busca de preços (o campo `voltagemCasa` existe) e gráfico do histórico de preço no item.
- Alertas de queda de preço (`alertaPreco` existe, mas não é usado).
- Deploy: ainda roda só no computador do dono.
- Opcionais discutidos:
  - fonte GeckoAPI para o Mercado Livre (paga, coleta das páginas públicas);
  - filtro por loja no lugar do campo Marca;
  - tela de Cômodos como tabela editável;
  - modo escuro (a proposta D está no canvas).

**Riscos conhecidos:**
- O modo automático aplica as migrações no banco real sem revisão. É preciso cuidado redobrado com migrações destrutivas.
- O banco nos EUA deixa cada consulta lenta. Um projeto do Supabase em São Paulo exigiria migrar os dados, o que agora dá para fazer com backup e importação.
- O token conferido fica guardado na memória da API até expirar (no máximo 1 h), então um logout não o invalida na hora.
- A GeckoAPI e coletores de páginas dependem do site das lojas não mudar. Por isso não foram adotados.

## 11. Referências

- [`README.md`](../README.md): como rodar, variáveis, comandos, login, busca de preços, backup e roadmap.
- [`CHANGELOG.md`](../CHANGELOG.md): histórico de tudo, com o motivo de cada mudança.
- [`docs/arquitetura.md`](arquitetura.md): decisões, estrutura, modelo de dados e migrações.
- [`docs/api.md`](api.md) · [`docs/backup.md`](backup.md) · [`docs/ux-8-regras.md`](ux-8-regras.md).
- [`docs/design/`](design/): modelos de telas, identidades A, B e C e estilos D a H. O G está em uso.
- Canvas de design (privado do dono): https://claude.ai/artifact/TUjJMSBd4XSLrPrhCijLrX
