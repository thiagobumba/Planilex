-- Nova situação de item: "Cadastrado" (preço escolhido na busca de preços).
-- Só adiciona um valor ao enum; nenhum dado é apagado ou alterado.
ALTER TYPE "SituacaoItem" ADD VALUE IF NOT EXISTS 'CADASTRADO' AFTER 'PESQUISANDO';
