/*
  Warnings:

  - The `status` column on the `debtors` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sales` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('UNPAID', 'PAID', 'DEBT', 'CANCELLED');

-- AlterTable
ALTER TABLE "debtors" DROP COLUMN "status",
ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "status",
ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX "debtors_customerID_status_idx" ON "debtors"("customerID", "status");
