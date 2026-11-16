# As 8 regras de ouro (Shneiderman) no Planilex

| # | Regra | Onde aparece nas telas |
|---|-------|------------------------|
| 1 | Consistência | Mesmo menu, cores, botões e etiquetas de situação em todas as telas |
| 2 | Atalhos para usuários frequentes | `Ctrl K` para buscar; ações em lote na lista de itens |
| 3 | Feedback informativo | Status da pesquisa por loja, barras de uso por cômodo, "atualizado há 2 min" |
| 4 | Diálogos com fechamento | Botão "Adicionar à Cozinha" e resumo do impacto antes de confirmar |
| 5 | Prevenção de erros | Filtro de voltagem da casa, aviso de limite estourado, cômodo sugerido |
| 6 | Desfazer ações facilmente | "Desfazer" após adicionar ou excluir |
| 7 | Controle nas mãos do usuário | Você escolhe oferta, cômodo e situação; nada é comprado automaticamente |
| 8 | Menos carga de memória | Trilha de navegação, preço com data da consulta, saldo sempre visível no menu |

## Acessibilidade

- Contraste de texto de pelo menos 4,5:1
- Áreas de toque de no mínimo 44 px
- Situação indicada por texto, não só por cor

## Situação na implementação

Atualizado em 2026-11-16, com login, painel, itens, cômodos e configurações prontos.

| # | Regra | Implementado | Pendente |
|---|-------|--------------|----------|
| 1 | Consistência | Menu lateral, cores, botões e etiquetas iguais em todas as telas (`globals.css`) | — |
| 2 | Atalhos | Abas por cômodo e filtros na lista de itens; cartões do painel levam direto aos itens do cômodo | `Ctrl K` para buscar; ações em lote |
| 3 | Feedback | Mensagem de sucesso ou erro em todo formulário; botão mostra "Salvando…"; barras de uso por cômodo e aviso de limite estourado | Status da busca de preços |
| 4 | Fechamento | Mensagens específicas ("“Micro-ondas” adicionado.", "“Cama box” foi salvo."); botão de excluir diz o nome do item | Impacto no limite antes de adicionar (tela 3 do modelo) |
| 5 | Prevenção de erros | Valor pago só aparece e é obrigatório quando o item é "Comprado"; cômodo com itens não pode ser excluído; exclusão de item pede confirmação | Filtro de voltagem nas ofertas |
| 6 | Desfazer | — | "Desfazer" depois de excluir ou alterar, usando a tabela `atividades` |
| 7 | Controle do usuário | Nada muda sem o usuário confirmar; tudo editável depois | — |
| 8 | Menos memória | Trilha de navegação; saldo disponível sempre visível no menu; contagem de dias até o casamento | Data da consulta de preço |
