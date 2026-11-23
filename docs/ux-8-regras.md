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

Atualizado em 2026-11-23 (revisão pelas diretrizes da Apple: acessibilidade e celular), com login (Google e e-mail/senha), painel, itens, cômodos e configurações prontos.

| # | Regra | Implementado | Pendente |
|---|-------|--------------|----------|
| 1 | Consistência | Identidade B · Casa Nova em todas as telas: mesmas variáveis de cor, logo, menu, botões e etiquetas (`globals.css`); no celular, barra de abas fixa embaixo (Painel, Itens, Cômodos, Ajustes) no lugar do menu lateral | — |
| 2 | Atalhos | Enter no nome do item busca preços; "Usar este preço" preenche o valor; abas por cômodo e filtros na lista de itens; cartões do painel levam direto aos itens do cômodo; botão "Marcar comprado" direto na lista, sem abrir o item | `Ctrl K` para buscar; ações em lote |
| 3 | Feedback | Ao clicar no menu, a página mostra na hora um esqueleto animado enquanto busca os dados (`loading.tsx`); Busca de preços mostra "Pesquisando…", a data e a hora da consulta e se veio da busca guardada; convite diz se o e-mail foi enviado e, se não foi, o motivo (aviso amarelo); mensagem de sucesso ou erro em todo formulário; página que não carrega explica o motivo e oferece "Tentar de novo"; falha de login explica a causa e o que fazer; botão mostra "Salvando…"; barras de uso por cômodo e aviso de limite estourado | — |
| 4 | Fechamento | Mensagens específicas ("“Micro-ondas” adicionado.", "“Cama box” foi salvo."); botão de excluir diz o nome do item | Impacto no limite antes de adicionar (tela 3 do modelo) |
| 5 | Prevenção de erros | Tela inicial avisa para não criar um segundo orçamento se o de vocês já existe; remover pessoa pede confirmação; criar conta pede a senha duas vezes; exemplos nos campos começam com "Ex.:" para não parecerem valores preenchidos; valor pago só aparece e é obrigatório quando o item é "Comprado"; cômodo com itens não pode ser excluído; exclusão de item pede confirmação | Filtro de voltagem nas ofertas |
| 6 | Desfazer | Convite pode ser cancelado e o e-mail reenviado; "Desmarcar" devolve um item comprado para "Falta comprar" | "Desfazer" depois de excluir ou alterar, usando a tabela `atividades` |
| 7 | Controle do usuário | Botão do Google volta ao normal quando o usuário retorna com "voltar"; nada muda sem o usuário confirmar; tudo editável depois; "Sair" sempre visível, mesmo se a API falhar | — |
| 8 | Menos memória | Formulário "Adicionar item" recolhido atrás de "+ Novo item", com a lista em primeiro lugar; no celular, cada item vira um cartão com tudo visível, sem rolar para o lado; Guias "Falta comprar" e "Comprados" com a contagem de cada uma; rodapé da guia mostra quanto falta comprar; Ofertas em páginas de 10, com a posição na lista ("11–20 de 25") e a página atual destacada; oferta escolhida fica no item, com loja, link e data da consulta; tela inicial mostra um exemplo do painel ao lado do login (no computador); tela inicial sem orçamento mostra o e-mail da pessoa para ela pedir o convite; trilha de navegação; saldo disponível sempre visível no menu; contagem de dias até o casamento | — |

## Acessibilidade (revisão de 2026-11-23)

| Ponto | Valor |
|-------|-------|
| Borda de campos e botões secundários (`--cor-borda-forte` `#7d8a83`) | 3,6:1 sobre branco, 3,3:1 sobre o fundo (antes `#d5dcd7`, 1,4:1) |
| Contorno de foco do teclado (`--cor-primaria`) | 7,8:1 sobre branco (antes `#7fb59b`, 2,3:1) |
| "Saldo disponível" no menu | 4,7:1 (antes 3,97:1) |
| Texto secundário (`#4a5752`) | 7,6:1 sobre branco |
| Etiquetas de situação | de 7,2:1 a 10,5:1 |
| Alvos de toque no celular | 44 px: abas, "Marcar comprado", "Editar", paginação, "Ver na loja" |

Pendentes da revisão: tela de Cômodos como tabela editável (hoje um cartão por cômodo), dica no lugar do exemplo "Sem limite" e modo escuro.

