/*
  Warnings:

  - A unique constraint covering the columns `[saleID]` on the table `debtors` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "debtors_saleID_key" ON "debtors"("saleID");
