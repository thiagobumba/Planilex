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
- **Um único `.env` na raiz:** API, site e Prisma leem o mesmo arquivo.

## Estrutura do repositório

```
planilex/
├── apps/
│   ├── web/                    # Next.js 16 (App Router), porta 3000
│   │   └── src/app/            # páginas; globals.css tem as cores dos modelos
│   └── api/                    # Fastify 5, porta 3333
│       └── src/
│           ├── server.ts       # sobe o servidor
│           ├── app.ts          # registra plugins e rotas
│           ├── env.ts          # lê o .env da raiz
│           └── routes/         # uma pasta/arquivo por grupo de rotas
├── packages/
│   └── db/                     # pacote @planilex/db
│       ├── prisma/
│       │   ├── schema.prisma   # modelo de dados
│       │   └── migrations/     # histórico de alterações do banco
│       ├── prisma.config.ts    # conexão usada pelo Prisma CLI
│       └── src/index.ts        # criarPrisma(): cliente usado pela API
├── docs/                       # documentação
├── .env.example                # modelo das variáveis de ambiente
└── package.json                # workspaces e comandos
```

## Modelo de dados

Definido em `packages/db/prisma/schema.prisma`. Tabelas no banco em português e `snake_case`.

| Modelo (tabela) | Campos principais | Observações |
|-----------------|-------------------|-------------|
| `Orcamento` (`orcamentos`) | nome, valor total, reserva para imprevistos, data do casamento, voltagem da casa, CEP | Raiz de tudo |
| `MembroOrcamento` (`membros_orcamento`) | orçamento, usuário, papel (DONO / EDITOR) | `usuario_id` é o id do usuário no Supabase Auth; permite dividir o orçamento |
| `Comodo` (`comodos`) | orçamento, nome, limite, ordem | Nome único por orçamento |
| `Item` (`itens`) | cômodo, nome, quantidade, situação (PESQUISANDO / ESCOLHIDO / COMPRADO), valor previsto, valor pago, oferta escolhida, alerta de preço | |
| `Oferta` (`ofertas`) | item, loja, título, preço, frete, total, link, voltagem, data da consulta | Índice por item + total para ordenar pelo preço final |
| `HistoricoPreco` (`historico_precos`) | item, data, menor preço | Um registro por item por dia (gráfico de 30 dias) |
| `Atividade` (`atividades`) | orçamento, usuário, ação, descrição, dados, desfeita em | Os `dados` guardam o necessário para o "Desfazer" |

Valores em dinheiro usam `DECIMAL(12,2)`, nunca número com vírgula flutuante. Apagar um orçamento apaga tudo que pertence a ele.

### Migrações

| Migração | O que faz |
|----------|-----------|
| `20261116120000_inicial` | Cria todas as tabelas e os tipos `Voltagem`, `Papel` e `SituacaoItem` |

## Busca de preços

| Fonte | Observação |
|-------|------------|
| API pública do Mercado Livre | Oficial e gratuita |
| Serviço de busca do Google Shopping (ex.: SerpAPI) | Pago, cobre várias lojas de uma vez |
| Leitura direta dos sites das lojas | Frágil e muitas vezes vai contra os termos de uso; evitar |

Regras:
- Ordenar pelo **preço final** (produto + frete).
- Guardar a data e a hora de cada consulta.
- Filtrar pela voltagem da casa por padrão.
