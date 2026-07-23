-- CreateTable
CREATE TABLE "setting" (
    "key" VARCHAR(60) NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("key")
);
