-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Voltagem" AS ENUM ('V127', 'V220', 'BIVOLT');

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('DONO', 'EDITOR');

-- CreateEnum
CREATE TYPE "SituacaoItem" AS ENUM ('PESQUISANDO', 'ESCOLHIDO', 'COMPRADO');

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "reserva_imprevistos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "data_casamento" DATE,
    "voltagem_casa" "Voltagem" NOT NULL DEFAULT 'V220',
    "cep" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_orcamento" (
    "orcamento_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'EDITOR',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_orcamento_pkey" PRIMARY KEY ("orcamento_id","usuario_id")
);

-- CreateTable
CREATE TABLE "comodos" (
    "id" UUID NOT NULL,
    "orcamento_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "limite" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens" (
    "id" UUID NOT NULL,
    "comodo_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "situacao" "SituacaoItem" NOT NULL DEFAULT 'PESQUISANDO',
    "valor_previsto" DECIMAL(12,2),
    "valor_pago" DECIMAL(12,2),
    "oferta_escolhida_id" UUID,
    "alerta_preco" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "loja" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "frete" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "url" TEXT NOT NULL,
    "voltagem" "Voltagem",
    "consultado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ofertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_precos" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "menor_preco" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "historico_precos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades" (
    "id" UUID NOT NULL,
    "orcamento_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "acao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desfeita_em" TIMESTAMP(3),

    CONSTRAINT "atividades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membros_orcamento_usuario_id_idx" ON "membros_orcamento"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "comodos_orcamento_id_nome_key" ON "comodos"("orcamento_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "itens_oferta_escolhida_id_key" ON "itens"("oferta_escolhida_id");

-- CreateIndex
CREATE INDEX "itens_comodo_id_idx" ON "itens"("comodo_id");

-- CreateIndex
CREATE INDEX "ofertas_item_id_total_idx" ON "ofertas"("item_id", "total");

-- CreateIndex
CREATE UNIQUE INDEX "historico_precos_item_id_data_key" ON "historico_precos"("item_id", "data");

-- CreateIndex
CREATE INDEX "atividades_orcamento_id_criado_em_idx" ON "atividades"("orcamento_id", "criado_em");

-- AddForeignKey
ALTER TABLE "membros_orcamento" ADD CONSTRAINT "membros_orcamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comodos" ADD CONSTRAINT "comodos_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens" ADD CONSTRAINT "itens_comodo_id_fkey" FOREIGN KEY ("comodo_id") REFERENCES "comodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens" ADD CONSTRAINT "itens_oferta_escolhida_id_fkey" FOREIGN KEY ("oferta_escolhida_id") REFERENCES "ofertas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_precos" ADD CONSTRAINT "historico_precos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

