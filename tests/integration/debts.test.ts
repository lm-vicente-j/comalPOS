import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { loginAs, logout, resetDb, seedBase } from "./helpers";
import { getAllDebtors, getDebtsSummary, payAccount, toDebt } from "@/lib/actions/debts";
import type { Sale } from "@/lib/actions/sales";

describe("debts actions", () => {
    let adminId: number;
    let customerId: number;
    let sales: Sale[];

    beforeAll(async () => {
        await resetDb();
        const { admin, jornada } = await seedBase();
        adminId = admin.id;

        const customer = await prisma.customer.create({
            data: { customerName: "Deudor Uno", phone: "555", currentBalance: 0 },
        });
        customerId = customer.id;

        const s1 = await prisma.sales.create({
            data: { total: 40, status: "UNPAID", source_type: "CL- Deudor Uno", placedBy: adminId, jornadaId: jornada.id },
        });
        const s2 = await prisma.sales.create({
            data: { total: 60, status: "UNPAID", source_type: "CL- Deudor Uno", placedBy: adminId, jornadaId: jornada.id },
        });
        sales = [s1, s2].map((s) => ({ id: s.id, total: Number(s.total) })) as unknown as Sale[];
    });

    it("rejects toDebt without a session", async () => {
        logout();
        expect(await toDebt(customerId, sales)).toMatchObject({ msg: "UNAUTHORIZED" });
        expect(await prisma.debtors.count()).toBe(0);
    });

    it("toDebt moves the sales to debt and raises the customer balance", async () => {
        loginAs("ADMIN", adminId);
        const res = await toDebt(customerId, sales);
        expect(res).toMatchObject({ msg: "SUCCESS" });

        const debtors = await prisma.debtors.findMany();
        expect(debtors).toHaveLength(2);
        expect(debtors.every((d) => d.status === "DEBT" && d.customerID === customerId)).toBe(true);

        const dbSales = await prisma.sales.findMany({ where: { id: { in: sales.map((s) => s.id) } } });
        expect(dbSales.every((s) => s.status === "DEBT" && s.customerID === customerId)).toBe(true);

        const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
        expect(Number(customer.currentBalance)).toBe(100);
    });

    it("summary and grouped debtors reflect the new debt", async () => {
        loginAs("ADMIN", adminId);
        const summary = await getDebtsSummary();
        expect(summary.totalAmount).toBe(100);
        expect(summary.activeDebtors).toBe(1);

        const grouped = await getAllDebtors();
        expect(grouped).toHaveLength(1);
        expect(grouped[0].amount).toBe(100);
    });

    it("payAccount marks debts paid and lowers the balance", async () => {
        loginAs("ADMIN", adminId);
        const res = await payAccount(customerId, sales, "CASH");
        expect(res).toMatchObject({ msg: "SUCCESS" });

        const debtors = await prisma.debtors.findMany();
        expect(debtors.every((d) => d.status === "PAID" && d.paidAt !== null)).toBe(true);

        const dbSales = await prisma.sales.findMany({ where: { id: { in: sales.map((s) => s.id) } } });
        expect(dbSales.every((s) => s.status === "PAID" && s.payment_method === "CASH")).toBe(true);

        const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
        expect(Number(customer.currentBalance)).toBe(0);
    });

    it("debtor queries are empty without a session", async () => {
        logout();
        expect(await getAllDebtors()).toEqual([]);
        expect(await getDebtsSummary()).toEqual({ totalAmount: 0, activeDebtors: 0, todayPayments: 0 });
    });
});
