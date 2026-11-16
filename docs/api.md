# API do Planilex

Endereço local: `http://localhost:3333` (porta definida por `API_PORT` no `.env`).
Respostas em JSON. Código-fonte das rotas em `apps/api/src/routes/`.

## Convenções

- **Erros:** sempre `{ "erro": "mensagem em português" }`. Erros de validação também trazem `"campo"`.

  | Código | Quando |
  |--------|--------|
  | 400 | Dados inválidos (validação com zod) ou regra de negócio quebrada |
  | 401 | Sem token ou token inválido/expirado |
  | 404 | Registro não existe **ou** o usuário não é membro do orçamento (não revela que existe) |
  | 409 | Conflito: nome de cômodo repetido, cômodo com itens |
  | 500 | Erro inesperado (detalhes só no log da API) |

- **Dinheiro:** números em reais com centavos (`689.9`). No banco ficam em `DECIMAL(12,2)`.
- **Datas:** `AAAA-MM-DD`.
- **Valores dos itens:** `valorPrevisto` e `valorPago` são o **total do item**, já considerando a quantidade.

## Autenticação

Todas as rotas, exceto as de saúde, exigem o token de acesso do Supabase:

```
Authorization: Bearer <access_token>
```

O site envia o token da sessão do usuário logado. A API confere a assinatura com `supabase.auth.getClaims()`, que usa as chaves públicas do projeto (JWKS), e usa o `sub` do token como id do usuário. Código: `apps/api/src/plugins/autenticacao.ts`.

O acesso a cada registro é checado pela tabela `membros_orcamento` (`apps/api/src/acesso.ts`): só membros do orçamento leem ou alteram os dados dele.

## Saúde (públicas)

### `GET /health`
Confere se a API está no ar. Não acessa o banco. **200** `{ "status": "ok" }`

### `GET /health/banco`
Confere se a API consegue falar com o banco (executa `SELECT 1`).
**200** `{ "status": "ok" }` · **503** `{ "status": "erro", "mensagem": "..." }`

## Orçamentos

### `GET /orcamentos`
Orçamentos de que o usuário é membro.
```json
[{ "id": "uuid", "nome": "Nossa casa", "valorTotal": 60000, "reservaImprevistos": 6000,
   "dataCasamento": "2027-04-18", "voltagemCasa": "V220", "cep": null, "papel": "DONO" }]
```

### `POST /orcamentos`
Cria o orçamento, coloca o usuário como `DONO` e, por padrão, cria os cômodos Cozinha, Sala, Quarto, Banheiro, Área de serviço e Materiais e obra (sem limite).

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `nome` | texto (1–120) | sim |
| `valorTotal` | número ≥ 0 | sim |
| `reservaImprevistos` | número ≥ 0 | não (padrão 0) |
| `dataCasamento` | `AAAA-MM-DD` ou `null` | não |
| `voltagemCasa` | `V127`, `V220`, `BIVOLT` | não (padrão `V220`) |
| `cep` | texto (até 9) ou `null` | não |
| `comodosPadrao` | booleano | não (padrão `true`) |

**201** com o orçamento criado.

### `GET /orcamentos/:id`
Orçamento com o resumo usado no painel.
```json
{
  "id": "uuid", "nome": "Nossa casa", "valorTotal": 60000, "...": "...",
  "resumo": { "previsto": 18850, "pago": 650, "aPagar": 18200, "disponivel": 41150,
              "quantidadeItens": 3, "quantidadeComprados": 1,
              "percentualPrevisto": 31, "percentualPago": 1 },
  "comodos": [{ "id": "uuid", "nome": "Cozinha", "limite": 15000, "ordem": 0,
                "previsto": 15650, "pago": 650, "quantidadeItens": 2, "quantidadeComprados": 1,
                "percentualDoLimite": 104, "acimaDoLimite": true, "excedente": 650 }]
}
```
Regras do cálculo (`apps/api/src/resumo.ts`):
- **Previsto** de um item = valor pago, se o item está `COMPRADO`; senão, o valor previsto (ou 0).
- **Disponível** = total do orçamento − previsto.
- **A pagar** = previsto − pago.

### `PATCH /orcamentos/:id`
Altera qualquer campo do `POST` (menos `comodosPadrao`). **200** com o orçamento.

## Cômodos

### `POST /orcamentos/:orcamentoId/comodos`
`{ "nome": "Varanda", "limite": 2000 }` (`limite` opcional, padrão 0 = sem limite; `ordem` opcional, padrão: depois do último).
**201** com o cômodo · **409** se o nome já existe no orçamento.

### `PATCH /comodos/:id`
Altera `nome`, `limite` e/ou `ordem`. **200** com o cômodo · **409** nome repetido.

### `DELETE /comodos/:id`
**204**. Só exclui cômodo **sem itens**; com itens responde **409** pedindo para mover ou excluir os itens antes.

## Itens

### `GET /orcamentos/:orcamentoId/itens`
Filtros opcionais na query: `comodoId`, `situacao` (`PESQUISANDO`, `ESCOLHIDO`, `COMPRADO`), `busca` (parte do nome, sem diferenciar maiúsculas).
```json
[{ "id": "uuid", "nome": "Micro-ondas 32L Inox", "comodoId": "uuid", "comodo": "Cozinha",
   "quantidade": 1, "situacao": "COMPRADO", "valorPrevisto": 689.9, "valorPago": 650,
   "alertaPreco": true, "atualizadoEm": "2026-11-16T12:00:00.000Z" }]
```
Ordenados pela ordem do cômodo e pela data de criação.

### `POST /itens`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `nome` | texto (1–160) | sim |
| `comodoId` | uuid | sim |
| `quantidade` | inteiro ≥ 1 | não (padrão 1) |
| `situacao` | `PESQUISANDO`, `ESCOLHIDO`, `COMPRADO` | não (padrão `PESQUISANDO`) |
| `valorPrevisto` | número ≥ 0 ou `null` | não |
| `valorPago` | número ≥ 0 ou `null` | só quando `COMPRADO` |
| `alertaPreco` | booleano | não (padrão `true`) |

Regras:
- `COMPRADO` exige `valorPago` (senão **400**).
- Fora de `COMPRADO`, o `valorPago` é descartado.

**201** com o item.

### `PATCH /itens/:id`
Altera qualquer campo do `POST`. Mover para outro cômodo só é permitido dentro do mesmo orçamento. Ao sair de `COMPRADO`, o `valorPago` é apagado. **200** com o item.

### `DELETE /itens/:id`
**204**.

## Testes

`apps/api/test/api.test.ts` testa todas as rotas contra um PostgreSQL de teste (nunca o banco real):

```bash
TEST_DATABASE_URL="postgresql://postgres@localhost:5432/planilex_teste" npm test -w @planilex/api
```

O banco de teste precisa estar com as migrações aplicadas (`DIRECT_URL=<mesmo endereço> npm run db:deploy`). Nos testes, a verificação do token é trocada por uma falsa (`definirVerificadorDeToken`), então o Supabase não é necessário.
