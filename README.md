# Planilex

Controle de previsão de gastos para o casamento e a montagem da casa: móveis, eletrodomésticos e materiais.
Você cadastra um produto (ex.: "micro-ondas"), o sistema busca o melhor preço na web e o item entra no orçamento, organizado por cômodo.

> **Status:** fase de planejamento. Ainda não há código da aplicação, só documentação e modelos de telas.

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

## Arquitetura proposta

Detalhes em [`docs/arquitetura.md`](docs/arquitetura.md).

- **Frontend:** Next.js (React) + TypeScript
- **Backend:** Node.js + TypeScript (Fastify), API REST
- **Banco:** PostgreSQL + Prisma, hospedado no Supabase (com Supabase Auth para o login)
- **Busca de preços:** APIs (Mercado Livre, serviço de Google Shopping) antes de qualquer leitura direta de sites

## Documentação e histórico

- Todas as alterações ficam registradas em [`CHANGELOG.md`](CHANGELOG.md).
- As regras do projeto (documentação obrigatória, git, idioma) estão em [`CLAUDE.md`](CLAUDE.md).

## Roadmap

1. [x] Modelos de telas
2. [ ] Estrutura do monorepo (web + api + banco)
3. [ ] Cadastro de orçamento, cômodos e itens
4. [ ] Busca de preços
5. [ ] Alertas de preço e histórico
6. [ ] Deploy
