# Histórico de alterações

Todas as alterações do projeto são registradas aqui, da mais recente para a mais antiga.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada entrada informa:
- **O que mudou**: arquivos e funcionalidades afetados
- **Por quê**: motivo ou pedido que originou a mudança
- **Impacto**: o que muda para quem usa ou desenvolve (migrações, novas variáveis de ambiente, telas alteradas)

---

## [Não lançado]

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
