# Arquitetura

## Stack

| Camada | Escolha | Por quê |
|--------|---------|---------|
| Frontend | Next.js (React) + TypeScript | Framework mais usado, grande comunidade, roda no Vercel de graça |
| Backend | Node.js + TypeScript com Fastify | Mesma linguagem do frontend, rápido e simples |
| Banco | PostgreSQL + Prisma | Relacional (orçamento → cômodos → itens → ofertas), migrações tipadas |
| Hospedagem do banco | **Supabase** | Login pronto (e-mail ou Google) para dividir o orçamento, painel web para ver as tabelas, plano gratuito suficiente |
| Autenticação | Supabase Auth | Evita construir login do zero |

## Decisões

### 2026-11-16 · Banco no Supabase
- **Escolhido:** Supabase (PostgreSQL + Auth).
- **Alternativas consideradas:**
  - Neon: só PostgreSQL, sem login pronto.
  - SQLite: mais simples, mas só funciona local, sem acesso pelo celular nem compartilhamento.
- **Motivo:** projeto pessoal e simples, com mais de uma pessoa acessando o mesmo orçamento; o login pronto economiza trabalho.
- **Cuidado:** no plano gratuito, o projeto é pausado depois de cerca de uma semana sem uso. Os dados não se perdem; basta reativar pelo painel do Supabase.
- **Saída:** como é PostgreSQL padrão acessado via Prisma, dá para migrar para outro provedor sem reescrever o app.

### 2026-11-16 · Monorepo com npm workspaces e Prisma 7
- **Escolhido:** um único repositório com npm workspaces (`apps/*` e `packages/*`), sem ferramentas extras como Turborepo.
- **Motivo:** projeto pequeno; o npm já resolve o compartilhamento do pacote do banco entre a API e o site.
- **Prisma 7:** a URL do banco fica em `packages/db/prisma.config.ts` (não mais no `schema.prisma`) e o cliente conecta pelo driver `pg` (`@prisma/adapter-pg`). A versão 8 ainda está em teste (release candidate), por isso ficamos na 7.
- **Duas conexões com o Supabase:** `DATABASE_URL` (transaction pooler, porta 6543) para a API e `DIRECT_URL` (session pooler, porta 5432) para as migrações, como recomendam as documentações do Prisma e do Supabase.
- **Um único `.env` na raiz:** API, site e Prisma leem o mesmo arquivo. No site, o `next.config.ts` recarrega as variáveis da raiz com `loadEnvConfig(raiz, dev, undefined, true)`. Sem o `true` (forceReload), o Next reaproveita a leitura que já fez em `apps/web` e ignora a raiz. As variáveis `NEXT_PUBLIC_*` também vão no campo `env` da configuração, para chegarem ao código do navegador.

### 2026-11-16 · Dados acessados só pela nossa API (RLS ativo, sem políticas)
- **Contexto:** o Supabase expõe automaticamente as tabelas do schema `public` pela Data API (REST/GraphQL), usando a chave pública (`anon`), que fica visível no navegador. As tabelas apareciam como **UNRESTRICTED** no painel.
- **Decisão:** ativar o Row Level Security em todas as tabelas **sem nenhuma política**. Assim a Data API não lê nem altera nada; todo acesso aos dados passa pela API do Planilex (Fastify + Prisma), que conecta com o usuário `postgres`, dono das tabelas, e por isso não é afetada pelo RLS.
- **Regra:** toda tabela nova precisa de `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` na mesma migração que a cria.
- **Login:** o site usa a chave pública só para o Supabase Auth; a API valida o token do usuário e decide o que ele pode ver.

### 2026-11-16 · Login com Google e como a API confia no usuário
- **Escolhido pelo dono do projeto:** login com conta Google e, desde 2026-11-16, também com e-mail e senha (Supabase Auth). A API não muda: nos dois casos ela recebe o mesmo tipo de token.
- **E-mail e senha:** o formulário roda no navegador (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser`). A confirmação de e-mail e o link de nova senha voltam pelo mesmo `/auth/callback`, que aceita `?proxima=` só com caminhos internos, para não poder mandar o usuário a outro site. O link de nova senha leva a `/auth/nova-senha`.
- **Fluxo:**
  1. O site chama `signInWithOAuth` (Google) ou `signInWithPassword` (e-mail). No Google, o Supabase devolve para `/auth/callback` com um código.
  2. O callback troca o código pela sessão, gravada em cookies (`@supabase/ssr`).
  3. O `proxy.ts` do Next (o antigo "middleware", renomeado no Next 16) renova a sessão a cada requisição e manda para `/login` quem não está logado.
  4. As páginas e server actions chamam a API no servidor, enviando o token em `Authorization: Bearer`.
  5. A API valida o token com `getClaims()` (chaves públicas do projeto) e checa se o usuário é membro do orçamento.
- **Por que a API valida de novo:** a API é a única porta para os dados (o RLS bloqueia a Data API). Ela não pode confiar em quem chama, só no token assinado pelo Supabase.
- **Orçamento compartilhado por convite:** cada forma de login com um e-mail diferente é um usuário diferente no Supabase. Para todos verem o mesmo orçamento, o dono convida os e-mails em Configurações › Pessoas com acesso; no primeiro acesso com aquele e-mail, o convite vira acesso (`EDITOR`). Quem não foi convidado não vê nada, mesmo criando conta. O site usa o primeiro orçamento do usuário.

### 2026-11-16 · E-mail do convite pelo Supabase Auth
- **Escolhido:** a própria API pede ao Supabase Auth para enviar o e-mail. Para quem não tem conta, usa `inviteUserByEmail`, com a chave secreta; para quem já tem, `signInWithOtp`.
- **Por que o Supabase e não um serviço de e-mail à parte:** o link do e-mail já faz o login da pessoa, e o convite vira acesso no mesmo instante.
- **Fluxo implícito:** como o pedido sai do servidor, não há navegador para guardar o verificador do PKCE. Os tokens chegam no `#` da URL e a página `/auth/link`, que roda no navegador, grava a sessão. Todos os outros logins continuam usando PKCE pelo `/auth/callback`.
- **Chave secreta:** `SUPABASE_SECRET_KEY` fica só no `.env` e só a API lê. O `next.config.ts` repassa ao navegador apenas as variáveis `NEXT_PUBLIC_*`.
- **Limitação:** o SMTP padrão do Supabase só entrega para membros da equipe do projeto. Para uso real, é preciso SMTP próprio (README › E-mail do convite). O convite vale mesmo quando o e-mail não sai.

### 2026-11-16 · Identidade visual B · Casa Nova
- **Escolhida pelo dono do projeto** entre três direções (`docs/design/identidade/`).
- As cores ficam só em variáveis CSS no começo de `globals.css`. As regras não usam cores soltas, o que permite trocar a identidade sem mexer nas telas.

### 2026-11-16 · Busca de preços pelo SerpApi (Google Shopping)
- **Escolhida pelo dono do projeto** entre SerpApi, Claude com busca na web, API do Mercado Livre e leitura direta dos sites.
- **Motivo:** cobre várias lojas brasileiras numa chamada, devolve dados estruturados (preço numérico, loja, link) e o plano grátis basta para um orçamento de casamento.
- A chave (`SERPAPI_KEY`) fica só na API. O site chama `GET /precos` por uma server action e nunca fala direto com o SerpApi.

## Estrutura do repositório

```
planilex/
├── apps/
│   ├── web/                    # Next.js 16 (App Router), porta 3000
│   │   └── src/
│   │       ├── proxy.ts        # renova a sessão e protege as páginas
│   │       ├── app/
│   │       │   ├── login/      # tela de login (Google + e-mail e senha)
│   │       │   ├── auth/       # callback (PKCE), link do e-mail (/auth/link), nova senha e "Sair"
│   │       │   └── (app)/      # telas logadas: painel, itens, cômodos, configurações
│   │       │       └── acoes.ts  # server actions que chamam a API
│   │       ├── components/     # menu, formulários e campos reutilizados
│   │       └── lib/            # cliente Supabase, chamada à API, formatos, tipos
│   └── api/                    # Fastify 5, porta 3333
│       └── src/
│           ├── server.ts       # sobe o servidor
│           ├── app.ts          # registra plugins e rotas
│           ├── env.ts          # lê o .env da raiz
│           ├── plugins/        # autenticação (token do Supabase)
│           ├── acesso.ts       # checagem de membro do orçamento
│           ├── resumo.ts       # cálculo de previsto, pago e disponível
│           ├── emails.ts       # envio do e-mail do convite pelo Supabase Auth
│           ├── precos.ts       # busca de preços no SerpApi (Google Shopping) e cache
│           └── routes/         # saúde, orçamentos, cômodos, itens
│       ├── scripts/            # testar-serpapi.mjs (npm run precos:testar)
│       └── test/               # testes de ponta a ponta da API
├── packages/
│   └── db/                     # pacote @planilex/db
│       ├── prisma/
│       │   ├── schema.prisma   # modelo de dados
│       │   └── migrations/     # histórico de alterações do banco
│       ├── prisma.config.ts    # conexão usada pelo Prisma CLI
│       └── src/index.ts        # criarPrisma(): cliente usado pela API
├── docs/                       # documentação
├── scripts/                    # planilex-automatico.ps1 (modo automático no Windows)
├── iniciar-planilex.cmd        # abre o modo automático
├── iniciar-api.cmd             # sobe só a API (manual)
├── atualizar-e-iniciar-site.cmd # atualiza e sobe só o site (manual)
├── .env.example                # modelo das variáveis de ambiente
└── package.json                # workspaces e comandos
```

## Modelo de dados

Definido em `packages/db/prisma/schema.prisma`. Tabelas no banco em português e `snake_case`.

| Modelo (tabela) | Campos principais | Observações |
|-----------------|-------------------|-------------|
| `Orcamento` (`orcamentos`) | nome, valor total, reserva para imprevistos, data do casamento, voltagem da casa, CEP | Raiz de tudo |
| `MembroOrcamento` (`membros_orcamento`) | orçamento, usuário, e-mail, papel (DONO / EDITOR) | `usuario_id` é o id do usuário no Supabase Auth; o e-mail é guardado para mostrar quem tem acesso |
| `Convite` (`convites`) | orçamento, e-mail (minúsculo), quem convidou | Um por e-mail por orçamento; apagado quando vira acesso |
| `Comodo` (`comodos`) | orçamento, nome, limite, ordem | Nome único por orçamento |
| `Item` (`itens`) | cômodo, nome, quantidade, situação (PESQUISANDO / CADASTRADO / ESCOLHIDO / COMPRADO), valor previsto, valor pago, oferta escolhida, alerta de preço | Valores são o **total** do item (já com a quantidade). `COMPRADO` exige valor pago |
| `Oferta` (`ofertas`) | item, loja, título, preço, frete, total, link, voltagem, data da consulta | Índice por item + total para ordenar pelo preço final |
| `HistoricoPreco` (`historico_precos`) | item, data, menor preço | Um registro por item por dia (gráfico de 30 dias) |
| `BuscaPreco` (`buscas_preco`) | termo (único), resultado (JSON), criado em | Cache de 24 h da busca de preços |
| `Atividade` (`atividades`) | orçamento, usuário, ação, descrição, dados, desfeita em | Os `dados` guardam o necessário para o "Desfazer" |

Valores em dinheiro usam `DECIMAL(12,2)`, nunca número com vírgula flutuante. Apagar um orçamento apaga tudo que pertence a ele.

### Migrações

| Migração | O que faz |
|----------|-----------|
| `20261116120000_inicial` | Cria todas as tabelas e os tipos `Voltagem`, `Papel` e `SituacaoItem` |
| `20261116130000_ativa_rls` | Ativa o Row Level Security em todas as tabelas, sem políticas (bloqueia a Data API do Supabase) |
| `20261116150000_buscas_preco` | Cria a tabela `buscas_preco` (cache da busca de preços), com RLS. Só adiciona |
| `20261116160000_situacao_cadastrado` | Adiciona `CADASTRADO` ao enum `SituacaoItem`. Só adiciona |
| `20261116140000_convites` | Cria a tabela `convites` (com RLS) e a coluna `email` em `membros_orcamento`. Só adiciona |

## Busca de preços

| Fonte | Observação |
|-------|------------|
| **Google Shopping via SerpApi** (escolhida) | Cobre várias lojas de uma vez; plano grátis com 250 buscas por mês |
| API do Mercado Livre | Desde 2025 a busca exige token OAuth (responde 403 sem login) e cobre uma loja só |
| Claude com busca na web | Entende descrições soltas, mas é mais lento, menos confiável para preço e cobrado por busca e por token |
| Leitura direta dos sites das lojas | Frágil e muitas vezes vai contra os termos de uso; evitar |

Regras:
- A busca roda **só quando o usuário pede** (botão ou Enter), nunca a cada tecla, para não gastar a cota.
- Cache de 24 h por termo normalizado (tabela `buscas_preco`).
- Ordenar pelo menor preço. O SerpApi não traz o frete como número, então hoje o total da oferta é igual ao preço.
- Guardar a data e a hora de cada consulta (a oferta escolhida e o histórico do dia ficam com o item).
- Pendente: filtrar pela voltagem da casa.
