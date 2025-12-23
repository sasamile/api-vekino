-- AlterTable
ALTER TABLE "user" ADD COLUMN     "condominioId" STRING;

-- CreateTable
CREATE TABLE "condominio" (
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "databaseUrl" STRING NOT NULL,
    "databaseName" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOL NOT NULL DEFAULT true,

    CONSTRAINT "condominio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "condominio_name_idx" ON "condominio"("name");

-- CreateIndex
CREATE UNIQUE INDEX "condominio_databaseName_key" ON "condominio"("databaseName");

-- CreateIndex
CREATE INDEX "user_condominioId_idx" ON "user"("condominioId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
