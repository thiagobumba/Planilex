-- Papel que o convidado recebe ao aceitar o convite. Usado pela importação de backup,
-- que transforma cada pessoa com acesso num convite com o mesmo papel (DONO ou EDITOR).
-- Só adiciona uma coluna com valor padrão; nenhum dado é apagado ou alterado.
ALTER TABLE "convites" ADD COLUMN "papel" "Papel" NOT NULL DEFAULT 'EDITOR';
