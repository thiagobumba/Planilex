# API do Planilex

Endereço local: `http://localhost:3333` (porta definida por `API_PORT` no `.env`).
Respostas em JSON. Código-fonte das rotas em `apps/api/src/routes/`.

## Saúde

### `GET /health`
Confere se a API está no ar. Não acessa o banco.

**Resposta 200**
```json
{ "status": "ok" }
```

### `GET /health/banco`
Confere se a API consegue falar com o banco no Supabase (executa `SELECT 1`).

**Resposta 200**
```json
{ "status": "ok" }
```

**Resposta 503** (sem `DATABASE_URL` no `.env`, ou o banco não respondeu: senha errada, projeto pausado no Supabase etc.)
```json
{ "status": "erro", "mensagem": "Não foi possível conectar ao banco" }
```
