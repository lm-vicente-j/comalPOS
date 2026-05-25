-- CreateEnum
CREATE TYPE "JornadaStatus" AS ENUM ('OPEN', 'CLOSED', 'AUTO_CLOSED');

-- AlterTable
ALTER TABLE "bill" ADD COLUMN     "jornadaId" INTEGER;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "jornadaId" INTEGER;

-- CreateTable
CREATE TABLE "jornada" (
    "id" SERIAL NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedBy" INTEGER NOT NULL,
    "closedBy" INTEGER,
    "status" "JornadaStatus" NOT NULL DEFAULT 'OPEN',
    "openingAmount" DECIMAL NOT NULL,
    "expectedClosingAmount" DECIMAL,
    "actualClosingAmount" DECIMAL,

    CONSTRAINT "jornada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jornada_status_openedAt_idx" ON "jornada"("status", "openedAt");

-- CreateIndex
CREATE INDEX "bill_jornadaId_idx" ON "bill"("jornadaId");

-- CreateIndex
CREATE INDEX "sales_jornadaId_idx" ON "sales"("jornadaId");

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
