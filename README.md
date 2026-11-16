# Planilex

Controle de previsão de gastos para o casamento e a montagem da casa: móveis, eletrodomésticos e materiais.
Você cadastra um produto (ex.: "micro-ondas"), o sistema busca o melhor preço na web e o item entra no orçamento, organizado por cômodo.

> **Status:** estrutura do projeto pronta (site, API e banco). As telas ainda não foram implementadas.

## Modelos de telas

- Canvas interativo (privado do dono): https://claude.ai/artifact/TUjJMSBd4XSLrPrhCijLrX
- Fontes dos modelos: [`docs/design/`](docs/design/)

| # | Tela | Para que serve |
|---|------|----------------|
| 1 | Painel | Orçamento total, previsto, pago, disponível, uso por cômodo e alertas |
| 2 | Buscar preços | Ofertas de várias lojas ordenadas pelo preço final (com frete) |
| 3 | Adicionar ao orçamento | Escolha do cômodo e da situação, com o impacto no limite antes de confirmar |
| 4 | Itens | Lista por cômodo e situação, com ações em lote e "Desfazer" |
| 5 | Celular | Painel resumido com menu inferior |

As decisões de UX seguem as 8 regras de ouro do Shneiderman: veja [`docs/ux-8-regras.md`](docs/ux-8-regras.md).

## Arquitetura

Detalhes em [`docs/arquitetura.md`](docs/arquitetura.md). Rotas da API em [`docs/api.md`](docs/api.md).

- **Frontend:** Next.js (React) + TypeScript, em `apps/web`
- **Backend:** Node.js + TypeScript (Fastify), API REST, em `apps/api`
- **Banco:** PostgreSQL + Prisma, hospedado no Supabase (com Supabase Auth para o login), em `packages/db`
- **Busca de preços:** APIs (Mercado Livre, serviço de Google Shopping) antes de qualquer leitura direta de sites

## Como rodar no seu computador

Pré-requisitos: [Node.js 22 ou mais novo](https://nodejs.org) e um projeto criado no [Supabase](https://supabase.com).

```bash
# 1. Instalar as dependências
npm install

# 2. Criar o arquivo de configuração e preencher com os dados do Supabase
cp .env.example .env

# 3. Criar as tabelas no banco
npm run db:deploy

# 4. Subir a API (http://localhost:3333) e o site (http://localhost:3000), cada um num terminal
npm run dev:api
npm run dev:web
```

> **Scripts de instalação (npm 11 e 12):** o `package.json` tem o campo `allowScripts`, que autoriza só os pacotes que precisam rodar script ao instalar: `prisma`, `@prisma/engines` (baixam os motores do Prisma) e `esbuild` (usado pelo `tsx` para rodar a API). Se um pacote novo precisar de script, revise antes de incluir com `npm install-scripts approve <pacote>`.
>
> **`git pull` reclamando do `package-lock.json`:** acontece quando a sua versão do npm reescreve esse arquivo. Descarte a mudança local com `git checkout -- package-lock.json`, rode `git pull` e depois `npm install`.

Para conferir se a API está falando com o banco, abra http://localhost:3333/health/banco: deve aparecer `{"status":"ok"}`.

### Variáveis de ambiente (`.env`)

| Variável | Onde encontrar | Para que serve |
|----------|----------------|----------------|
| `DATABASE_URL` | Supabase › **Connect** › Transaction pooler (porta 6543), com `?pgbouncer=true` no final | Conexão da API com o banco |
| `DIRECT_URL` | Supabase › **Connect** › Session pooler (porta 5432) | Conexão usada para criar e alterar tabelas |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API › Project URL | Login (Supabase Auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase › Project Settings › API › chave pública (anon/publishable) | Login (Supabase Auth) |
| `API_PORT` | — | Porta da API (padrão 3333) |
| `WEB_ORIGIN` | — | Endereço do site que pode chamar a API (padrão http://localhost:3000) |
| `NEXT_PUBLIC_API_URL` | — | Endereço da API usado pelo site |

O arquivo `.env` tem senha do banco e **nunca** vai para o GitHub (está no `.gitignore`).

### Comandos

O `npm install` já compila o pacote do banco automaticamente (script `postinstall`).


| Comando | O que faz |
|---------|-----------|
| `npm run dev:web` | Sobe o site em modo de desenvolvimento |
| `npm run dev:api` | Compila o pacote do banco e sobe a API em modo de desenvolvimento |
| `npm run build` | Gera as versões de produção (banco, API e site) |
| `npm run typecheck` | Confere os tipos do TypeScript em todo o projeto |
| `npm run db:generate` | Gera o cliente do Prisma e compila o pacote do banco (`packages/db/dist`) |
| `npm run db:migrate` | Cria uma nova migração depois de alterar o `schema.prisma` e recompila o pacote do banco |
| `npm run db:deploy` | Aplica as migrações pendentes no banco |
| `npm run db:studio` | Abre o Prisma Studio para ver os dados |
| `npm run db:testar` | Testa as conexões `DATABASE_URL` e `DIRECT_URL` e mostra a mensagem exata do servidor, sem exibir a senha |

### Problemas de conexão com o banco

Se o `npm run db:deploy` mostrar `P1001: Can't reach database server`, rode `npm run db:testar`. O Prisma esconde o motivo real; esse comando mostra a mensagem do servidor. Causas comuns:

| Mensagem do `db:testar` | Causa provável | O que fazer |
|-------------------------|----------------|-------------|
| `password authentication failed` | Senha errada ou desatualizada no `.env` | Copie de novo a senha (ou gere outra em Supabase › Connect › Reset database password) |
| `Tenant or user not found` | Endereço do pooler ou usuário errado | Copie de novo o endereço em Supabase › Connect; o host pode ser `aws-0-...` ou `aws-1-...` |
| `endereço inválido` | Colchetes ou caracteres especiais (`@ # / ? $`) na senha | Tire os colchetes; use uma senha só com letras e números |
| `timeout` ou `ECONNREFUSED` | Rede, firewall ou VPN bloqueando a porta | Teste no PowerShell: `Test-NetConnection <host> -Port 5432` |

## Documentação e histórico

- Todas as alterações ficam registradas em [`CHANGELOG.md`](CHANGELOG.md).
- As regras do projeto (documentação obrigatória, git, idioma) estão em [`CLAUDE.md`](CLAUDE.md).

## Roadmap

1. [x] Modelos de telas
2. [x] Estrutura do monorepo (web + api + banco)
3. [ ] Login e cadastro de orçamento, cômodos e itens
4. [ ] Busca de preços
5. [ ] Alertas de preço e histórico
6. [ ] Deploy
