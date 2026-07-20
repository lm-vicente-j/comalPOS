import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { loginAs, logout, resetDb } from "./helpers";
import { closeJornada, getActiveJornadaWithStats, openJornada } from "@/lib/actions/jornada";

describe("jornada actions", () => {
    let adminId: number;

    beforeAll(async () => {
        await resetDb();
        const admin = await prisma.users.create({
            data: { name: "Admin Caja", email: "caja@test.local", role: "ADMIN", active: true },
        });
        adminId = admin.id;
    });

    it("rejects openJornada for non-admin sessions and invalid amounts", async () => {
        logout();
        expect(await openJornada(500)).toMatchObject({ success: false, error: "PERMISSION DENIED" });

        loginAs("ADMIN", adminId);
        expect(await openJornada(-5)).toMatchObject({ success: false });
        expect(await prisma.jornada.count()).toBe(0);
    });

    it("opens a jornada and blocks a second one", async () => {
        loginAs("ADMIN", adminId);
        expect(await openJornada(500)).toMatchObject({ success: true });

        const row = await prisma.jornada.findFirstOrThrow();
        expect(row.status).toBe("OPEN");
        expect(row.openedBy).toBe(adminId);
        expect(Number(row.openingAmount)).toBe(500);

        const again = await openJornada(300);
        expect(again).toMatchObject({ success: false, error: "PENDING_JORNADA", pendingJornadaId: row.id });
        expect(await prisma.jornada.count()).toBe(1);
    });

    it("reports the active jornada with stats", async () => {
        loginAs("ADMIN", adminId);
        const state = await getActiveJornadaWithStats();
        expect(state?.state).toBe("OWN_OPEN");

        logout();
        expect(await getActiveJornadaWithStats()).toBeNull();
    });

    it("closes the jornada computing the expected amount", async () => {
        loginAs("ADMIN", adminId);
        const jornada = await prisma.jornada.findFirstOrThrow({ where: { status: "OPEN" } });

        // opening 500 + cash sales 200 - bills 50 - deposits 30 + withdraws 10 = 630
        await prisma.sales.create({
            data: { total: 200, status: "PAID", payment_method: "CASH", source_type: "VENTA_LIBRE", placedBy: adminId, jornadaId: jornada.id },
        });
        // Neither of these ever put cash in the register, so the expected
        // amount must ignore them even though their payment_method is CASH:
        // a cancelled sale keeps its original payment_method...
        await prisma.sales.create({
            data: { total: 500, status: "CANCELLED", payment_method: "CASH", source_type: "VENTA_LIBRE", placedBy: adminId, jornadaId: jornada.id },
        });
        // ...and a sale converted to debt is collected on a later day.
        await prisma.sales.create({
            data: { total: 300, status: "DEBT", payment_method: "CASH", source_type: "CL- Deudor", placedBy: adminId, jornadaId: jornada.id },
        });
        await prisma.bill.create({
            data: { amount: 50, category: "Otros", description: "Gasto jornada", date: new Date(), registered_by: adminId, jornadaId: jornada.id },
        });
        await prisma.savings_movement.create({
            data: { amount: 30, type: "DEPOSIT", registered_by: adminId, jornadaId: jornada.id },
        });
        await prisma.savings_movement.create({
            data: { amount: 10, type: "WITHDRAW", registered_by: adminId, jornadaId: jornada.id },
        });

        const res = await closeJornada(jornada.id, 640);
        expect(res).toMatchObject({ success: true });

        const closed = await prisma.jornada.findUniqueOrThrow({ where: { id: jornada.id } });
        expect(closed.status).toBe("CLOSED");
        expect(closed.closedBy).toBe(adminId);
        expect(closed.closedAt).not.toBeNull();
        expect(Number(closed.expectedClosingAmount)).toBe(630);
        expect(Number(closed.actualClosingAmount)).toBe(640);
    });

    it("refuses to close a jornada twice or with invalid data", async () => {
        loginAs("ADMIN", adminId);
        const closed = await prisma.jornada.findFirstOrThrow({ where: { status: "CLOSED" } });

        expect(await closeJornada(closed.id, 100)).toMatchObject({ success: false, error: "La jornada ya está cerrada" });
        expect(await closeJornada(99999, 100)).toMatchObject({ success: false, error: "Jornada no encontrada" });
        expect(await closeJornada(closed.id, -1)).toMatchObject({ success: false, error: "Monto físico inválido" });
    });
});
