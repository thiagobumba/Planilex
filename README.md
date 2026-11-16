# Planilex

Controle de previsão de gastos para o casamento e a montagem da casa: móveis, eletrodomésticos e materiais.
Você cadastra um produto (ex.: "micro-ondas"), o sistema busca o melhor preço na web e o item entra no orçamento, organizado por cômodo.

> **Status:** login com Google e cadastro de orçamento, cômodos e itens funcionando. Próximo passo: busca de preços.

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

Pré-requisitos: [Node.js 22 ou mais novo](https://nodejs.org), um projeto criado no [Supabase](https://supabase.com) e o login com Google configurado (veja [Login com Google](#login-com-google)).

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

### Atalhos no Windows

Na pasta do projeto há dois scripts. Dá para abrir com dois cliques ou digitando o nome no Prompt de Comando. Cada um abre a sua própria janela, que precisa ficar aberta enquanto você usa o app.

| Script | O que faz |
|--------|-----------|
| `iniciar-api.cmd` | Confere se o `npm` e o `.env` existem, instala as dependências se faltarem e sobe a API (`npm run dev:api`) em http://localhost:3333 |
| `atualizar-e-iniciar-site.cmd` | Descarta a alteração automática do `package-lock.json`, faz `git pull`, `npm install` e sobe o site (`npm run dev:web`) em http://localhost:3000 |

Os dois rodam em modo silencioso: mostram só as etapas, os erros e a saída da API ou do site. Se algo falhar, a janela fica aberta com a mensagem.

Ordem recomendada:
1. `atualizar-e-iniciar-site.cmd`, que atualiza o projeto e sobe o site.
2. `iniciar-api.cmd`, em outra janela.

Depois de uma atualização, feche a janela da API e abra de novo para ela pegar as mudanças.

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
| `npm test -w @planilex/api` | Testes da API contra um PostgreSQL de teste (precisa de `TEST_DATABASE_URL`; veja `docs/api.md`) |
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

## Login

Duas formas de entrar, ambas pelo Supabase Auth: **conta Google** e **e-mail e senha** (com confirmação por e-mail e "Esqueci a senha"). Se a mesma pessoa usar as duas com o mesmo e-mail, o Supabase junta as duas formas na mesma conta.

### Login com Google

Configuração (uma vez só):

1. **Google Cloud** (console.cloud.google.com) › projeto **Planilex** › **Google Auth Platform**:
   - Tela de consentimento: público **Externo**; em **Público-alvo**, adicione como **usuários de teste** os e-mails que vão usar o app.
   - **Clientes** › Criar cliente › **Aplicativo da Web**:
     - Origens JavaScript autorizadas: `http://localhost:3000`
     - URIs de redirecionamento autorizados: `https://<ID-DO-PROJETO>.supabase.co/auth/v1/callback`
2. **Supabase** › **Authentication**:
   - **Sign In / Providers › Google**: ative e cole o ID do cliente e a chave secreta. A chave secreta fica **só** no Supabase.
   - **URL Configuration**: Site URL `http://localhost:3000`; em Redirect URLs, adicione `http://localhost:3000/auth/**` (cobre o retorno do Google, a confirmação de e-mail e o link de nova senha).
3. **`.env`**: preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. A API usa os mesmos valores para validar o token.

Enquanto o app estiver em modo de teste no Google, só os e-mails da lista de usuários de teste conseguem entrar.

### Login com e-mail e senha

1. **Supabase › Authentication › Sign In / Providers › Email**: deixe **ativado**, com **Confirm email** ligado (recomendado).
2. A Redirect URL `http://localhost:3000/auth/**` (passo 2 acima) precisa estar cadastrada. Sem ela, os links do e-mail caem na página inicial sem fazer login.
3. O serviço de e-mail que já vem no Supabase envia **poucos e-mails por hora** e serve só para testes. Para uso diário, configure um SMTP próprio em **Authentication › Emails › SMTP Settings**.

Os links de confirmação e de nova senha precisam ser abertos **no mesmo navegador** em que a conta foi criada ou a senha foi pedida.

### Se o login falhar

A tela de login mostra o que fazer e o "detalhe técnico" (a mensagem original do Supabase/Google). O motivo também aparece no terminal do `npm run dev:web`, numa linha `[login] falhou: ...`.

| Detalhe técnico contém | O que fazer |
|------------------------|-------------|
| `Unable to exchange external code` | ID do cliente ou chave secreta do Google errados no Supabase |
| `access_denied` | E-mail fora da lista de usuários de teste no Google Cloud |
| `PKCE code verifier not found` | Login começou e terminou em lugares diferentes: outro navegador, `127.0.0.1` em vez de `localhost`, ou link do e-mail aberto em outro aparelho |
| `expired` | Link do e-mail expirado ou já usado: peça outro |

## Documentação e histórico

- Todas as alterações ficam registradas em [`CHANGELOG.md`](CHANGELOG.md).
- As regras do projeto (documentação obrigatória, git, idioma) estão em [`CLAUDE.md`](CLAUDE.md).

## Roadmap

1. [x] Modelos de telas
2. [x] Estrutura do monorepo (web + api + banco)
3. [x] Login (Google e e-mail/senha) e cadastro de orçamento, cômodos e itens
   - [ ] Convidar outra pessoa para o orçamento
   - [ ] "Desfazer" depois de excluir ou alterar
4. [ ] Busca de preços
5. [ ] Alertas de preço e histórico
6. [ ] Deploy
