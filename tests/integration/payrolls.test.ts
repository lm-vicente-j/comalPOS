import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { loginAs, logout, resetDb, seedBase } from "./helpers";
import { getSalaryHistory, getUserPayrollInfo, saveSalaryPayment } from "@/lib/actions/payrolls";

describe("payrolls actions", () => {
    let staffId: number;

    beforeAll(async () => {
        await resetDb();
        await seedBase();
        const staff = await prisma.users.create({
            data: { name: "Empleado Uno", username: "EMP1", role: "STAFF", active: true },
        });
        staffId = staff.id;
    });

    it("rejects saveSalaryPayment for non-admin sessions", async () => {
        logout();
        expect(await saveSalaryPayment({ userID: staffId, amount: 500, period: "SUELDO: semana 1" }))
            .toMatchObject({ success: false, error: "UNAUTHORIZED" });
        loginAs("STAFF", staffId);
        expect(await saveSalaryPayment({ userID: staffId, amount: 500, period: "SUELDO: semana 1" }))
            .toMatchObject({ success: false, error: "UNAUTHORIZED" });
        expect(await prisma.salary.count()).toBe(0);
    });

    it("registers a salary payment", async () => {
        loginAs("ADMIN");
        const res = await saveSalaryPayment({ userID: staffId, amount: 500, period: "SUELDO: semana 1" });
        expect(res).toMatchObject({ success: true });

        const row = await prisma.salary.findFirstOrThrow();
        expect(row.userID).toBe(staffId);
        expect(Number(row.amount)).toBe(500);
        expect(row.period).toBe("SUELDO: semana 1");
        expect(row.payDate).not.toBeNull();
    });

    it("rejects invalid payments with field errors", async () => {
        loginAs("ADMIN");
        const res = await saveSalaryPayment({ userID: staffId, amount: 0, period: "BONO: x" });
        expect(res.success).toBe(false);
        expect(await prisma.salary.count()).toBe(1);
    });

    it("paginates the salary history", async () => {
        loginAs("ADMIN");
        await prisma.salary.createMany({
            data: Array.from({ length: 32 }, (_, i) => ({
                userID: staffId, amount: 100 + i, period: `BONO: ${i}`, payDate: new Date(),
            })),
        });

        const page1 = await getSalaryHistory(staffId, 0, 30);
        expect(page1.items).toHaveLength(30);
        expect(page1.hasMore).toBe(true);

        const page2 = await getSalaryHistory(staffId, 30, 30);
        expect(page2.items).toHaveLength(3);
        expect(page2.hasMore).toBe(false);
    });

    it("getUserPayrollInfo returns the user info only with a session", async () => {
        loginAs("ADMIN");
        const info = await getUserPayrollInfo(staffId);
        expect(info?.name).toBe("Empleado Uno");

        logout();
        expect(await getUserPayrollInfo(staffId)).toBeNull();
        expect(await getSalaryHistory(staffId)).toEqual({ items: [], hasMore: false });
    });
});
