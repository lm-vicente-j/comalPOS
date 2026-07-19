/**
 * Deterministic seed for the e2e suite. Wipes the e2e database and creates
 * the minimum data the specs rely on: an admin (email/password) and a staff
 * user (username/pin), a couple of products and supplies, one customer, an
 * open jornada and enough bills to exercise the expenses infinite scroll.
 *
 * Run with: DATABASE_URL=... npx tsx tests/e2e/seed.ts
 */
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export const E2E = {
    adminEmail: "admin@e2e.local",
    adminPassword: "admin1234",
    staffUsername: "TEST1",
    staffPin: "1234",
    seedBills: 35,
};

async function main() {
    await prisma.$transaction([
        prisma.goal_contribution.deleteMany(),
        prisma.savings_goal.deleteMany(),
        prisma.savings_movement.deleteMany(),
        prisma.debtors.deleteMany(),
        prisma.sale_items.deleteMany(),
        prisma.sales.deleteMany(),
        prisma.recipes.deleteMany(),
        prisma.products.deleteMany(),
        prisma.supplies.deleteMany(),
        prisma.salary.deleteMany(),
        prisma.bill.deleteMany(),
        prisma.jornada.deleteMany(),
        prisma.customer.deleteMany(),
        prisma.users.deleteMany(),
    ]);

    const admin = await prisma.users.create({
        data: {
            name: "Admin E2E",
            email: E2E.adminEmail,
            username: "ADMIN1",
            password: await bcrypt.hash(E2E.adminPassword, 10),
            role: "ADMIN",
            active: true,
        },
    });

    await prisma.users.create({
        data: {
            name: "Staff E2E",
            username: E2E.staffUsername,
            pin: await bcrypt.hash(E2E.staffPin, 10),
            role: "STAFF",
            active: true,
        },
    });

    const cheese = await prisma.supplies.create({
        data: { name: "Queso E2E", measureUnit: "kg", currentStock: 100, unitCost: 50 },
    });
    await prisma.supplies.create({
        data: { name: "Harina E2E", measureUnit: "kg", currentStock: 50, unitCost: 20 },
    });

    await prisma.products.create({ data: { name: "Taco Pastor", price: 25 } });
    await prisma.products.create({
        data: {
            name: "Quesadilla Grande",
            price: 35,
            recipes: { create: [{ supplyID: cheese.id, quantityUsed: 1 }] },
        },
    });

    await prisma.customer.create({
        data: { customerName: "Cliente Uno E2E", phone: "555-000-11", currentBalance: 0 },
    });

    const jornada = await prisma.jornada.create({
        data: { openedBy: admin.id, openingAmount: 500, status: "OPEN" },
    });

    await prisma.bill.createMany({
        data: Array.from({ length: E2E.seedBills }, (_, i) => ({
            amount: 10,
            category: "Otros",
            description: `Gasto seed ${i + 1}`,
            date: new Date(),
            registered_by: admin.id,
            jornadaId: jornada.id,
        })),
    });

    console.log("e2e seed done");
}

main().finally(() => prisma.$disconnect());
