/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "bill" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "amount" DECIMAL NOT NULL,
    "category" VARCHAR(50),
    "date" DATE,
    "registered_by" INTEGER NOT NULL,

    CONSTRAINT "bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" SERIAL NOT NULL,
    "customerName" VARCHAR(100),
    "phone" VARCHAR(20),
    "alias" VARCHAR(30),
    "lastConsumption" DATE,
    "currentBalance" DECIMAL NOT NULL,
    "registeredDate" DATE,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debtors" (
    "id" SERIAL NOT NULL,
    "saleID" INTEGER NOT NULL,
    "customerID" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" VARCHAR(20),

    CONSTRAINT "debtors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(40),
    "price" DECIMAL NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "productID" INTEGER NOT NULL,
    "supplyID" INTEGER NOT NULL,
    "quantityUsed" DECIMAL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("productID","supplyID")
);

-- CreateTable
CREATE TABLE "salary" (
    "id" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "payDate" DATE,
    "period" VARCHAR(50),

    CONSTRAINT "salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" SERIAL NOT NULL,
    "saleID" INTEGER NOT NULL,
    "productID" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "total" DECIMAL,
    "status" VARCHAR(20),
    "source_type" VARCHAR(30),
    "customerID" INTEGER NOT NULL,
    "placedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(40),
    "measureUnit" VARCHAR(30),
    "currentStock" DECIMAL NOT NULL,
    "unitCost" DECIMAL NOT NULL DEFAULT 0,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150),
    "name" VARCHAR(50),
    "username" VARCHAR(50),
    "pin" VARCHAR(10),
    "password" VARCHAR(50),
    "role" VARCHAR(40),
    "active" BOOLEAN,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debtors_customerID_status_idx" ON "debtors"("customerID", "status");

-- CreateIndex
CREATE INDEX "sale_items_saleID_idx" ON "sale_items"("saleID");

-- CreateIndex
CREATE INDEX "sale_items_productID_idx" ON "sale_items"("productID");

-- CreateIndex
CREATE INDEX "sales_customerID_createdAt_idx" ON "sales"("customerID", "createdAt");

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "debtors" ADD CONSTRAINT "debtors_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "debtors" ADD CONSTRAINT "debtors_saleID_fkey" FOREIGN KEY ("saleID") REFERENCES "sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_productID_fkey" FOREIGN KEY ("productID") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_supplyID_fkey" FOREIGN KEY ("supplyID") REFERENCES "supplies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "salary" ADD CONSTRAINT "salary_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productID_fkey" FOREIGN KEY ("productID") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleID_fkey" FOREIGN KEY ("saleID") REFERENCES "sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_placedBy_fkey" FOREIGN KEY ("placedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
