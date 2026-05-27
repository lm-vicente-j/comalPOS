-- CreateEnum
CREATE TYPE "SavingsMovementType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "savings_movement" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" "SavingsMovementType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registered_by" INTEGER NOT NULL,
    "jornadaId" INTEGER,

    CONSTRAINT "savings_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goal" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "targetAmount" DECIMAL NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_contribution" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "savings_movement_jornadaId_idx" ON "savings_movement"("jornadaId");

-- CreateIndex
CREATE INDEX "savings_movement_createdAt_idx" ON "savings_movement"("createdAt");

-- CreateIndex
CREATE INDEX "goal_contribution_goalId_idx" ON "goal_contribution"("goalId");

-- AddForeignKey
ALTER TABLE "savings_movement" ADD CONSTRAINT "savings_movement_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_movement" ADD CONSTRAINT "savings_movement_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contribution" ADD CONSTRAINT "goal_contribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "savings_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
