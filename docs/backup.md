# Backup e importação

O Planilex guarda o backup em **um arquivo JSON**. O mesmo formato serve para três usos:

| Como | Quando usar | Onde fica |
|------|-------------|-----------|
| **Automático** | Sempre que a API está rodando: no máximo um por dia | Pasta `backups/` do projeto, com os 30 mais recentes |
| `npm run db:backup` | Antes de uma mudança grande, ou para levar o banco inteiro (todos os orçamentos) | `backups/planilex-AAAA-MM-DD-HHmm.json` |
| **Configurações › Backup › Baixar backup** | Pelo site, sem terminal: só o orçamento de vocês | Pasta de downloads do navegador |

A pasta `backups/` está no `.gitignore` e nunca vai para o GitHub, porque o arquivo tem os e-mails de quem tem acesso. **Guarde uma cópia fora do computador**, num Google Drive ou pen drive. Um backup que só existe no mesmo computador se perde junto com ele.

## O que entra no backup

- **Entra:** orçamento (nome, valores, data do casamento, voltagem e CEP), pessoas com acesso e convites pendentes (e-mail e papel), cômodos com os limites, itens (situação, quantidade, valores previsto e pago), ofertas guardadas com a oferta escolhida, e histórico de preços.
- **Não entra:**
  - **Contas de login:** ficam no Supabase Auth, e cada pessoa entra de novo com o Google ou com e-mail e senha.
  - **Cache das buscas de preço:** se refaz sozinho.
  - **Registro de atividades.**

## Restaurar numa instalação nova

1. Crie o projeto novo no Supabase, preencha o `.env` e rode `npm run db:deploy` para criar as tabelas (veja o README › Como rodar).
2. Importe o backup de um destes jeitos:
   - **Pelo site:** entre com o seu e-mail. Na tela "Vamos começar", use **Tem um backup? › Importar backup** e escolha o arquivo `.json`. Você vira **dono** do orçamento importado.
   - **Pelo terminal:** `npm run db:importar -- backups/planilex-AAAA-MM-DD-HHmm.json`. Esse comando importa todos os orçamentos do arquivo.
3. Cada pessoa do backup recupera o acesso ao entrar com o **mesmo e-mail de antes**, com o mesmo papel: dono continua dono, quem editava continua editando.

### Por que as pessoas viram convites

Os ids de usuário vêm do Supabase Auth. Num projeto novo do Supabase, a mesma pessoa ganha um id diferente. Por isso, a importação transforma cada pessoa com acesso num **convite pelo e-mail**, com o papel guardado na coluna `convites.papel`. No primeiro login, o convite vira acesso (`aceitarConvites`). O mesmo vale quando se importa no mesmo projeto: quem entrar com o e-mail recupera o acesso.

## Garantias

- **Nada é apagado ou alterado.** A importação cria orçamentos novos, com ids novos.
  - Num banco que já tem orçamentos, o comando do terminal avisa e pergunta antes de importar. `--sim` pula a pergunta.
  - O site só oferece a importação para quem ainda não tem orçamento.
- **Tudo ou nada.** A importação roda numa transação: se der erro no meio, nada fica gravado.
- **Formato com versão.** O arquivo traz `"formato": "planilex-backup"` e `"versao": 1`. Um arquivo de outro tipo, ou de uma versão mais nova do Planilex, é recusado com uma mensagem clara.

## Configuração (`.env`, opcional)

| Variável | Padrão | Para que serve |
|----------|--------|----------------|
| `BACKUP_AUTOMATICO` | ligado | `0` desliga o backup diário da API |
| `BACKUP_PASTA` | `backups` | Pasta dos backups, relativa à raiz do projeto ou caminho completo. Por exemplo, a pasta do Google Drive no computador, para ter cópia fora dele |
| `BACKUP_MANTER` | `30` | Quantos backups automáticos manter; os mais antigos são apagados |

## Código

- **Formato, exportação e importação:** `packages/db/src/backup.ts`, usado pelos comandos e pela API.
- **Comandos:** `packages/db/scripts/backup.mjs` e `packages/db/scripts/importar.mjs`.
- **Backup automático:** `apps/api/src/backupAutomatico.ts`. Ele confere 30 s depois de a API subir e depois a cada hora, e grava se o último backup tem mais de 24 h.
- **Rotas:** `GET /orcamentos/:id/backup` e `POST /orcamentos/importar` (`docs/api.md` › Backup).
