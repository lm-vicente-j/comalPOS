-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CASH');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "payment_method" VARCHAR(30);
