# Arquitetura proposta

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

## Estrutura do repositório (planejada)

```
planilex/
├── apps/
│   ├── web/        # Next.js
│   └── api/        # Fastify
├── packages/
│   └── db/         # schema Prisma e cliente compartilhado
└── docs/
```

## Modelo de dados (rascunho)

- **Orcamento**: valor total, reserva para imprevistos, data do casamento, voltagem da casa, CEP
- **Comodo**: nome, limite de gasto
- **Item**: nome, cômodo, quantidade, situação (pesquisando / escolhido / comprado), valor previsto, valor pago
- **Oferta**: item, loja, preço, frete, total, link, data da consulta
- **HistoricoPreco**: item, menor preço do dia
- **Atividade**: registro de ações, usado pelo "Desfazer"

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
