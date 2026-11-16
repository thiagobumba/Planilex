# Regras do projeto Planilex

## Documentação (obrigatória)

Toda alteração no repositório, por menor que seja, vem acompanhada de documentação no mesmo commit:

1. **`CHANGELOG.md`**: uma entrada em "[Não lançado]" com data, o que mudou (Adicionado / Alterado / Corrigido / Removido), por quê e o impacto.
2. **`docs/`**: atualizar o documento afetado.
   - Mudança de arquitetura, stack ou estrutura de pastas → `docs/arquitetura.md`
   - Mudança no banco de dados → `docs/arquitetura.md` (modelo de dados) e a descrição da migração no changelog
   - Mudança de tela ou de fluxo → `docs/ux-8-regras.md` e `docs/design/` quando o modelo mudar
   - Nova variável de ambiente, comando ou passo de instalação → `README.md`
   - Nova rota da API → documentação da API em `docs/` (criar quando existir a primeira rota)
3. **`README.md`**: atualizar o roadmap quando uma etapa for concluída.

Uma alteração sem documentação não está concluída.

## Git

- Toda alteração vai com commit e push para o GitHub, mantendo o repositório sincronizado.
- Mensagens de commit em português, descrevendo o que mudou e por quê.
- Antes de começar, puxar as mudanças feitas direto no GitHub.

## Idioma

Documentação, mensagens de commit e textos da interface em português do Brasil.
