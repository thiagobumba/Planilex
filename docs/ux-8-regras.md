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

Atualizado em 2026-11-16, com login (Google e e-mail/senha), painel, itens, cômodos e configurações prontos.

| # | Regra | Implementado | Pendente |
|---|-------|--------------|----------|
| 1 | Consistência | Identidade B · Casa Nova em todas as telas: mesmas variáveis de cor, logo, menu, botões e etiquetas (`globals.css`) | — |
| 2 | Atalhos | Enter no nome do item busca preços; "Usar este preço" preenche o valor; abas por cômodo e filtros na lista de itens; cartões do painel levam direto aos itens do cômodo; botão "Marcar comprado" direto na lista, sem abrir o item | `Ctrl K` para buscar; ações em lote |
| 3 | Feedback | Ao clicar no menu, a página mostra na hora um esqueleto animado enquanto busca os dados (`loading.tsx`); Busca de preços mostra "Pesquisando…", a data e a hora da consulta e se veio da busca guardada; convite diz se o e-mail foi enviado e, se não foi, o motivo (aviso amarelo); mensagem de sucesso ou erro em todo formulário; página que não carrega explica o motivo e oferece "Tentar de novo"; falha de login explica a causa e o que fazer; botão mostra "Salvando…"; barras de uso por cômodo e aviso de limite estourado | — |
| 4 | Fechamento | Mensagens específicas ("“Micro-ondas” adicionado.", "“Cama box” foi salvo."); botão de excluir diz o nome do item | Impacto no limite antes de adicionar (tela 3 do modelo) |
| 5 | Prevenção de erros | Tela inicial avisa para não criar um segundo orçamento se o de vocês já existe; remover pessoa pede confirmação; criar conta pede a senha duas vezes; exemplos nos campos começam com "Ex.:" para não parecerem valores preenchidos; valor pago só aparece e é obrigatório quando o item é "Comprado"; cômodo com itens não pode ser excluído; exclusão de item pede confirmação | Filtro de voltagem nas ofertas |
| 6 | Desfazer | Convite pode ser cancelado e o e-mail reenviado; "Desmarcar" devolve um item comprado para "Falta comprar" | "Desfazer" depois de excluir ou alterar, usando a tabela `atividades` |
| 7 | Controle do usuário | Botão do Google volta ao normal quando o usuário retorna com "voltar"; nada muda sem o usuário confirmar; tudo editável depois; "Sair" sempre visível, mesmo se a API falhar | — |
| 8 | Menos memória | Guias "Falta comprar" e "Comprados" com a contagem de cada uma; rodapé da guia mostra quanto falta comprar; Ofertas em páginas de 10, com a posição na lista ("11–20 de 25") e a página atual destacada; oferta escolhida fica no item, com loja, link e data da consulta; tela inicial mostra um exemplo do painel ao lado do login (no computador); tela inicial sem orçamento mostra o e-mail da pessoa para ela pedir o convite; trilha de navegação; saldo disponível sempre visível no menu; contagem de dias até o casamento | — |
