-- Convites para compartilhar o orçamento e e-mail dos membros.
-- Só adiciona (nenhum dado é apagado).

-- AlterTable
ALTER TABLE "membros_orcamento" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "convites" (
    "id" UUID NOT NULL,
    "orcamento_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "convidado_por" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "convites_email_idx" ON "convites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "convites_orcamento_id_email_key" ON "convites"("orcamento_id", "email");

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS sem políticas: a tabela não fica exposta pela Data API do Supabase (ver CLAUDE.md).
ALTER TABLE "convites" ENABLE ROW LEVEL SECURITY;
