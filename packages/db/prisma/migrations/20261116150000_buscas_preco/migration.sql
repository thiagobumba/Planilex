-- Cache das buscas de preço (SerpApi). Só adiciona (nenhum dado é apagado).

-- CreateTable
CREATE TABLE "buscas_preco" (
    "id" UUID NOT NULL,
    "termo" TEXT NOT NULL,
    "resultado" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buscas_preco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buscas_preco_termo_key" ON "buscas_preco"("termo");


-- RLS sem políticas: a tabela não fica exposta pela Data API do Supabase (ver CLAUDE.md).
ALTER TABLE "buscas_preco" ENABLE ROW LEVEL SECURITY;
