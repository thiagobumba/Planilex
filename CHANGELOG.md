# Histórico de alterações

Todas as alterações do projeto são registradas aqui, da mais recente para a mais antiga.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada entrada informa:
- **O que mudou**: arquivos e funcionalidades afetados
- **Por quê**: motivo ou pedido que originou a mudança
- **Impacto**: o que muda para quem usa ou desenvolve (migrações, novas variáveis de ambiente, telas alteradas)

---

## [Não lançado]

### 2026-11-16 · Situação "Cadastrado" para itens com preço da busca
**Adicionado**
- Nova situação de item **Cadastrado**, entre "Pesquisando" e "Escolhido", com etiqueta amarela na lista de itens e opção no filtro.
- Migração `20261116160000_situacao_cadastrado`: `ALTER TYPE "SituacaoItem" ADD VALUE 'CADASTRADO'`. Só adiciona um valor ao enum, sem apagar nem alterar dados.

**Alterado**
- Ao clicar em "Usar este preço" na busca, a situação do item muda sozinha de "Pesquisando" para "Cadastrado". Se o item já estiver "Escolhido" ou "Comprado", a situação não muda. Dá para trocar a situação à mão antes de salvar.

**Por quê:** pedido do dono, para distinguir o item que já tem preço vindo da busca do item que ainda está sendo pesquisado.

**Impacto:** os itens existentes continuam com a situação que tinham. A soma do previsto não muda: "Cadastrado" conta o valor previsto, como "Pesquisando" e "Escolhido". O modo automático aplica a migração sozinho; quem usa os scripts manuais precisa rodar `npm run db:deploy`, o que o `iniciar-api.cmd` já faz.

### 2026-11-16 · Paginação na busca de preços
**Alterado**
- A lista de ofertas mostra 10 por página, com "Anterior", "Próxima", os números das páginas e o resumo "11–20 de 25". Uma busca nova volta para a página 1, e trocar de página leva a tela para o topo da lista.
- A API devolve até 60 ofertas por busca, antes eram 20. O Google Shopping já entrega esse volume numa única consulta, então mais páginas não gastam mais cota do SerpApi.

**Por quê:** pedido do dono, para ver mais ofertas sem uma lista longa demais.

**Impacto:** buscas guardadas nas últimas 24 h continuam com até 20 ofertas até expirarem ou até usar "Atualizar preços". Não há migração.

### 2026-11-16 · Conferência da chave do SerpApi e ajuste no script do site
**Adicionado**
- Comando `npm run precos:testar` (`apps/api/scripts/testar-serpapi.mjs`). Ele pergunta ao SerpApi, pela Account API, se a `SERPAPI_KEY` é aceita, sem gastar busca da cota, e mostra o plano e as buscas restantes. Também aponta erros comuns ao colar a chave: aspas, espaços, versão mascarada (•) e tamanho diferente de 64 caracteres. A chave nunca é impressa inteira.

**Alterado**
- `atualizar-e-iniciar-site.cmd` (ajuste feito pelo dono): roda `npm run db:deploy` antes de subir o site. Assim, as migrações que chegam pelo `git pull` são aplicadas mesmo quando a API é aberta depois. Impacto: nenhum quando não há migração pendente; o comando só aplica o que falta.
- Mensagem de chave recusada na busca de preços: agora indica o `npm run precos:testar` e lembra de reiniciar a API, que só lê o `.env` ao iniciar.

**Por quê:** a busca mostrou "SERPAPI_KEY inválida" e não havia como conferir a chave sem gastar busca nem expor o valor.

### 2026-11-16 · Busca de preços (Google Shopping via SerpApi)
**Adicionado**
- Migração `20261116150000_buscas_preco`, que só adiciona: tabela `buscas_preco` (cache de 24 h por termo), com RLS.
- API:
  - `apps/api/src/precos.ts` e `GET /precos?q=...[&atualizar=1]`: consulta o SerpApi (`google_shopping`, Brasil), filtra as ofertas sem preço e as repetidas, ordena da mais barata para a mais cara (até 20) e guarda o resultado por 24 h. Os erros comuns viram mensagens em português.
  - `POST /itens` e `PATCH /itens/:id` aceitam `oferta`: gravam a oferta, ligam ao item e registram o menor preço do dia no histórico. A listagem de itens devolve `ofertaEscolhida`.
- Site:
  - no formulário de item, o botão **Buscar preços** (ou Enter no nome) mostra a lista de ofertas com loja, preço, entrega e link;
  - **Usar este preço** preenche o valor previsto (preço × quantidade) e mostra a oferta escolhida, com "Remover oferta" e "Ver outras ofertas";
  - "Atualizar preços" força uma busca nova;
  - a lista de itens mostra a loja, o preço e o link da oferta escolhida.
- Variável opcional `SERPAPI_KEY` (e `SERPAPI_URL`, só para testes).
- 2 testes novos da API (15 no total), com um SerpApi simulado.

**Alterado**
- `docs/arquitetura.md`:
  - decisão pelo SerpApi;
  - a tabela de fontes foi corrigida: a busca do Mercado Livre exige login OAuth desde 2025, e não é mais "oficial e gratuita";
  - regras da busca, modelo de dados e migração.
- `docs/api.md`: `GET /precos` e o campo `oferta` dos itens.
- `README.md`: seção "Busca de preços", variável na tabela e roadmap (etapa 4 concluída, com uma pendência).
- `docs/ux-8-regras.md` atualizado.

**Por quê:** pedido do dono do projeto, que escolheu o SerpApi entre as opções apresentadas.

**Impacto:**
- Aplicar a migração: o modo automático aplica sozinho; manualmente, `npm run db:deploy`.
- Para a busca funcionar, é preciso criar uma conta grátis no SerpApi e colocar a `SERPAPI_KEY` no `.env`. Sem ela, o botão avisa que a busca não está configurada.
- Verificado:
  - 15 testes da API;
  - no Chrome, com o SerpApi simulado: busca com Enter, ofertas ordenadas, "Usar este preço" com quantidade 2 (R$ 1.379,80), item salvo com a oferta e a segunda busca vinda do cache.

### 2026-11-16 · Identidade B também dentro do app
**Alterado**
- Menu lateral:
  - painel verde-floresta com textura de pontos, como a vitrine da tela inicial;
  - logo em menta (`Logo` ganhou a opção `sobreVerde`), item ativo em menta;
  - saldo num bloco translúcido e "Sair" com contorno claro.
  - No celular, o menu vira uma faixa verde no topo.
- Cartões e tabela: raio de 20 px e sombra suave; barras de progresso com pontas arredondadas.
- Títulos das páginas um pouco maiores (36 px), no mesmo peso da tela inicial.
- `docs/design/identidade/README.md`: como a identidade B aparece dentro do app.

**Por quê:** o dono do projeto achou que, depois da tela inicial, o app ainda não tinha a identidade B.

**Impacto:** só visual. Verificado no Chrome: painel, itens e configurações no computador, e painel no celular.

### 2026-11-16 · Identidade visual B · Casa Nova aplicada
**Alterado**
- `globals.css`:
  - novas variáveis de cor (floresta `#1F5C46`, menta `#DCEFE5`, grafite `#16211C`, mostarda para atenção, coral para limite estourado);
  - raios maiores;
  - nenhuma cor solta fora das variáveis (só o `#fff` dos textos sobre verde).
- Tela de login redesenhada: login à esquerda e, no computador, uma vitrine verde à direita com um exemplo do painel (marcado como "exemplo") e os três recursos principais. No celular aparece só o login.
- `Logo.tsx` e `icon.svg`: logo da casinha num quadrado verde.
- "Nova senha" e "link do e-mail" mantêm o cartão centralizado (classe `login-simples`).
- `docs/design/identidade/README.md`: direção B marcada como escolhida, com a tabela de variáveis.
- `docs/arquitetura.md` (decisão) e `docs/ux-8-regras.md` atualizados.

**Por quê:** o dono do projeto escolheu a direção B entre as três propostas.

**Impacto:**
- Só visual: nenhuma regra, rota ou dado mudou.
- Verificado no Chrome: login no computador e no celular, painel e lista de itens.

### 2026-11-16 · Propostas de identidade visual e correção do botão do Google
**Adicionado**
- `docs/design/identidade/`: três direções de identidade para a tela inicial e o app (A · Papelaria, B · Casa Nova, C · Livro-caixa noturno, inspirada no APIcanvas). Cada uma tem a tela de login e um quadro com logo, paleta, tipografia e componentes. Também estão no canvas de design, na página "Identidade visual". Nenhuma foi aplicada ao app ainda.

**Corrigido**
- `login/BotaoGoogle.tsx`: o botão ficava travado em "Abrindo o Google…" ao voltar da página do Google pelo botão "voltar" do navegador. Agora o evento `pageshow` destrava o botão.

**Por quê:**
- Pedido do dono do projeto: melhorar a tela inicial e repensar a identidade visual.
- O travamento do botão apareceu num print da tela de login.

**Impacto:** só a correção do botão muda o app. As propostas aguardam a escolha.

### 2026-11-16 · E-mail do convite
**Adicionado**
- `apps/api/src/emails.ts`: envia o e-mail do convite pelo Supabase Auth. Quem não tem conta recebe "Invite user"; quem já tem recebe "Magic link". Os erros comuns viram mensagens em português (SMTP padrão só para a equipe, limite por hora, chave inválida).
- `POST /convites/:id/reenviar`. O `POST /orcamentos/:id/convites` agora devolve `emailEnviado`, `tipoEmail` e `motivoEmail`.
- Variável opcional `SUPABASE_SECRET_KEY`, usada só pela API, em `.env.example` e no README.
- `apps/web/src/app/auth/link/`: recebe o clique no e-mail (tokens no `#` da URL) e conclui o login.
- `/auth/nova-senha?boas-vindas=1`: tela "Bem-vindo ao Planilex!" para quem foi convidado criar a senha, com a opção de pular.
- Configurações › Pessoas com acesso: botão **Reenviar e-mail** e aviso amarelo quando o e-mail não sai, explicando o motivo e lembrando que o convite vale.

**Alterado**
- `README.md`: seção "E-mail do convite", com o passo a passo do SMTP com Gmail e a tradução dos templates.
- `docs/api.md`, `docs/arquitetura.md` (decisão do fluxo implícito só para os links do e-mail) e `docs/ux-8-regras.md` atualizados.
- Testes da API: checam o resultado do e-mail sem a chave e o reenvio, que só o DONO pode fazer.

**Por quê:** o dono convidou um e-mail e esperava que a pessoa recebesse o convite.

**Impacto:**
- Para os e-mails chegarem, é preciso `SUPABASE_SECRET_KEY` no `.env` e SMTP próprio no Supabase. O SMTP padrão só entrega para a equipe do projeto e já afetava a confirmação de conta e o "Esqueci a senha".
- Sem isso, tudo continua funcionando, só sem enviar e-mail.
- Verificado no Chrome com o Supabase simulado: convite para conta nova, link para conta existente, reenviar, clique no link levando às boas-vindas e ao orçamento compartilhado, link expirado e envio recusado pelo SMTP padrão.

### 2026-11-16 · Motivo dos erros 500 visível em desenvolvimento
**Alterado**
- `apps/api/src/app.ts`: fora de produção, a resposta 500 inclui `Detalhe: <motivo>`, que aparece na tela de erro do site. Em produção, a mensagem continua genérica.
- `docs/api.md`: a convenção de erros foi atualizada.

**Por quê:** ao entrar com uma conta convidada, o site mostrou só "Erro inesperado no servidor", sem dizer a causa.

**Impacto:** só diagnóstico. Os testes da API continuam passando.

### 2026-11-16 · `iniciar-api.cmd` aplica as migrações antes de subir
**Alterado**
- `iniciar-api.cmd`: roda `npm run db:deploy` antes de `npm run dev:api` e para com uma mensagem se não conseguir.
- `README.md`: o novo passo na tabela de scripts e o que fazer quando a API responde "Erro inesperado no servidor" depois de uma atualização.

**Por quê:** depois do `git pull` da funcionalidade de convites, a API passou a procurar a tabela `convites`, que ainda não existia no banco, e respondeu 500.

**Impacto:** quem usa o script manual não precisa mais lembrar do `db:deploy`. O modo automático já fazia isso.

### 2026-11-16 · Orçamento compartilhado por convite
**Adicionado**
- Migração `20261116140000_convites`, que só adiciona e não apaga nada:
  - tabela `convites` (orçamento, e-mail, quem convidou), com RLS;
  - coluna `email` em `membros_orcamento`.
- API (`routes/pessoas.ts`):
  - `GET /orcamentos/:id/pessoas`;
  - `POST /orcamentos/:id/convites`;
  - `DELETE /convites/:id`;
  - `DELETE /orcamentos/:id/membros/:usuarioId`.
  - Só o DONO convida e remove pessoas.
- Aceite automático: no `GET /orcamentos`, os convites para o e-mail de quem entrou viram acesso como `EDITOR`, sem diferenciar maiúsculas.
- Site, em Configurações › **Pessoas com acesso**: lista quem tem acesso e os convites pendentes, convida por e-mail, cancela convite e remove acesso (com confirmação).
- Tela "Vamos começar": aviso para não criar outro orçamento e pedir o convite, mostrando o e-mail da pessoa.
- 3 testes novos da API (13 no total).

**Alterado**
- `POST /orcamentos` guarda o e-mail do dono.
- Configurações dividida em "Pessoas com acesso" e "Dados do orçamento".
- `docs/api.md`, `docs/arquitetura.md`, `docs/ux-8-regras.md` e `README.md` (seção Login e roadmap) atualizados.

**Por quê:** o dono entrou com o Google (um e-mail) e depois com e-mail e senha (outro e-mail) e não viu o orçamento. Para o Supabase, são duas contas. O orçamento é compartilhado, então todos os convidados precisam ver o mesmo.

**Impacto:**
- Aplicar a migração: o modo automático aplica sozinho; manualmente, `npm run db:deploy`.
- Para ver o orçamento com outro e-mail, entre com a conta que criou o orçamento e convide esse e-mail.
- Verificado:
  - 13 testes da API;
  - no Chrome, com duas pessoas: convite criado, convidado passa a ver o mesmo painel, convidado não vê o botão de convidar e a lista do dono mostra "Pode editar".

### 2026-11-16 · Modo automático: atualiza sozinho a cada alteração
**Adicionado**
- `iniciar-planilex.cmd` e `scripts/planilex-automatico.ps1`:
  - sobem a API e o site;
  - verificam o GitHub a cada 30 segundos (`-Intervalo` muda o tempo);
  - fazem `git pull` quando há commit novo e só reinstalam, recompilam ou reiniciam o que for necessário, conforme os arquivos alterados;
  - aplicam migrações novas no banco;
  - reiniciam a API ou o site se caírem.
- `.gitattributes`: os `.ps1` também usam CRLF.
- `CLAUDE.md`: aviso de que o modo automático aplica migrações no banco real (migrações que apagam dados exigem confirmação do dono) e de que mudanças no próprio script só valem depois de reabri-lo.
- `README.md`: seção "Modo automático (recomendado)".
- `docs/arquitetura.md`: os scripts na estrutura de pastas.

**Por quê:** pedido do dono do projeto, para cada alteração enviada ao GitHub chegar ao computador dele sem rodar nada à mão.

**Impacto:**
- Os scripts manuais continuam disponíveis.
- Não foi possível executar o PowerShell no ambiente de desenvolvimento (download bloqueado). O script foi revisado manualmente para o PowerShell 5.1 do Windows.

### 2026-11-16 · Scripts para Windows
**Adicionado**
- `iniciar-api.cmd`:
  - confere se `npm` e `.env` existem;
  - instala as dependências se faltarem;
  - roda `npm run dev:api` em modo silencioso.
- `atualizar-e-iniciar-site.cmd`:
  - descarta a alteração automática do `package-lock.json`;
  - roda `git pull`, `npm install` e `npm run dev:web`, todos em modo silencioso;
  - para com uma mensagem clara em qualquer erro.
- `.gitattributes`: os arquivos `.cmd` usam fim de linha CRLF, que o Prompt do Windows exige.
- `README.md`: seção "Atalhos no Windows".

**Por quê:** pedido do dono do projeto, para atualizar e subir o app sem digitar os comandos a cada vez.

**Impacto:**
- Nenhum no código do app.
- Os textos dos scripts estão sem acento, de propósito: o Prompt do Windows nem sempre mostra acentos corretamente.

### 2026-11-16 · Botão "Sair" sempre visível
**Alterado**
- `(app)/layout.tsx`:
  - "Sair" virou um botão de verdade, com ícone e largura total, abaixo de "Conectado como <e-mail>".
  - Se a API falhar, o menu continua aparecendo (o erro é tratado só na página).
- `globals.css`: no computador, o menu fica fixo na altura da tela (`position: sticky`), então o "Sair" aparece sem rolar a página.
- `next.config.ts`: o indicador do Next.js, que só aparece em desenvolvimento, passou para o canto inferior direito. No esquerdo ele cobria o "Sair".

**Adicionado**
- `(app)/error.tsx`: quando a página não carrega (por exemplo, com a API fora do ar), mostra "Não foi possível carregar esta página", diz qual terminal conferir e oferece "Tentar de novo". O menu e o "Sair" continuam disponíveis.

**Por quê:**
- O "Sair" ficava escondido atrás do indicador do Next.js e, em páginas longas, abaixo da dobra.
- Nos testes, uma falha da API derrubava a tela inteira, inclusive o "Sair".

**Impacto:** só visual e de robustez. Verificado no Chrome:
- "Sair" visível depois de rolar até o fim da página;
- no celular, aparece no topo;
- sair leva a `/login` e bloqueia as páginas internas, tanto com a API funcionando quanto com ela falhando.

### 2026-11-16 · Login com e-mail e senha
**Adicionado**
- `apps/web/src/app/login/FormEmail.tsx`: abas "Entrar" e "Criar conta" e o modo "Esqueci a senha". Criar conta pede a senha duas vezes (mínimo 8 caracteres) e envia o e-mail de confirmação.
- `apps/web/src/app/auth/nova-senha/`: página aberta pelo link de "Esqueci a senha", para criar a nova senha. Depois de salvar, o painel mostra "Senha alterada".
- `login/erros.ts`: mensagens em português para senha errada, e-mail não confirmado, senha fraca, excesso de tentativas, link expirado e provedor desativado.
- Estilos do formulário de e-mail em `globals.css`.

**Alterado**
- `auth/callback/route.ts`: aceita `?proxima=` para onde ir depois do login, só com caminhos internos.
- `login/page.tsx`: botão do Google, divisor "ou com e-mail" e o formulário.
- `README.md`: seção "Login" com a configuração do provedor Email e da Redirect URL `http://localhost:3000/auth/**`, aviso sobre o limite de e-mails do Supabase e novas linhas na tabela de diagnóstico.
- `docs/arquitetura.md` e `docs/ux-8-regras.md` atualizados.

**Por quê:** pedido do dono do projeto, como alternativa ao Google.

**Impacto:**
- No Supabase, trocar a Redirect URL `http://localhost:3000/auth/callback` por `http://localhost:3000/auth/**` (ou adicionar a nova). O link de nova senha usa `?proxima=`.
- O provedor Email precisa estar ativo, o que já é o padrão.
- A API não muda.
- Verificado no Chrome com o Supabase simulado: senha errada, senhas diferentes, conta criada aguardando confirmação, esqueci a senha, nova senha com e sem sessão, e bloqueio de `?proxima=` externo.

### 2026-11-16 · Exemplos dos campos com "Ex.:"
**Alterado**
- `CamposOrcamento.tsx` e `CamposItem.tsx`: os textos de exemplo dos campos de valor e de CEP agora começam com "Ex.:" (por exemplo, "Ex.: 60.000,00").

**Por quê:** no primeiro uso, os exemplos em cinza pareciam valores já preenchidos.

**Impacto:** só visual. Segue a regra 5 (prevenção de erros) em `docs/ux-8-regras.md`.

### 2026-11-16 · Motivo real das falhas de login na tela
**Alterado**
- `apps/web/src/app/auth/callback/route.ts`: guarda o motivo da falha, vindo do Google/Supabase (`error_description`) ou da troca do código, e repassa para `/login`. Também registra `[login] falhou: ...` no terminal do site.
- `apps/web/src/app/login/page.tsx`: mostra uma orientação em português e o detalhe técnico original.

**Adicionado**
- `apps/web/src/app/login/erros.ts`: traduz os motivos mais comuns (chave do Google errada, e-mail fora dos usuários de teste, endereços diferentes no início e no fim do login, URL de retorno não liberada, provedor desativado).
- `README.md`: tabela de diagnóstico na seção "Login com Google".

**Por quê:** o primeiro login real voltou para a tela de entrada com uma mensagem genérica, sem indicar a causa.

**Impacto:** nenhum no fluxo de login que funciona. Verificado simulando os retornos de erro do Supabase.

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
