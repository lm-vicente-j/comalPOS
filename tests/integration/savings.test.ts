import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { loginAs, logout, resetDb, seedBase } from "./helpers";
import {
    addContribution,
    cancelGoal,
    getGoalsWithProgress,
    getPoolBalance,
    getRecentMovements,
    saveGoal,
    saveMovement,
} from "@/lib/actions/savings";

describe("savings actions", () => {
    let adminId: number;
    let jornadaId: number;

    beforeAll(async () => {
        await resetDb();
        const { admin, jornada } = await seedBase();
        adminId = admin.id;
        jornadaId = jornada.id;
    });

    it("rejects saveMovement for non-admin sessions", async () => {
        logout();
        expect(await saveMovement(100, "DEPOSIT")).toMatchObject({ success: false, message: "PERMISSION DENIED" });
        loginAs("STAFF", adminId);
        expect(await saveMovement(100, "DEPOSIT")).toMatchObject({ success: false, message: "PERMISSION DENIED" });
        expect(await prisma.savings_movement.count()).toBe(0);
    });

    it("registers a deposit linked to the jornada and the user", async () => {
        loginAs("ADMIN", adminId);
        expect(await saveMovement(100, "DEPOSIT", "ahorro viernes")).toMatchObject({ success: true });

        const row = await prisma.savings_movement.findFirstOrThrow();
        expect(row.type).toBe("DEPOSIT");
        expect(Number(row.amount)).toBe(100);
        expect(row.registered_by).toBe(adminId);
        expect(row.jornadaId).toBe(jornadaId);
        expect(row.description).toBe("ahorro viernes");

        expect((await getPoolBalance()).balance).toBe(100);
    });

    it("registers a withdrawal and rejects overdrafts", async () => {
        loginAs("ADMIN", adminId);
        expect(await saveMovement(40, "WITHDRAW")).toMatchObject({ success: true });
        expect((await getPoolBalance()).balance).toBe(60);

        const res = await saveMovement(1000, "WITHDRAW");
        expect(res.success).toBe(false);
        expect((await getPoolBalance()).balance).toBe(60);
    });

    it("paginates recent movements", async () => {
        loginAs("ADMIN", adminId);
        const page1 = await getRecentMovements(1, 0);
        expect(page1.items).toHaveLength(1);
        expect(page1.hasMore).toBe(true);

        const page2 = await getRecentMovements(10, 1);
        expect(page2.items).toHaveLength(1);
        expect(page2.hasMore).toBe(false);
    });

    it("creates and updates a goal", async () => {
        loginAs("ADMIN", adminId);
        expect(await saveGoal({ name: "Horno", targetAmount: 200 })).toMatchObject({ success: true });

        const goal = await prisma.savings_goal.findFirstOrThrow({ where: { name: "Horno" } });
        expect(goal.status).toBe("ACTIVE");

        expect(await saveGoal({ id: goal.id, name: "Horno Industrial", targetAmount: 200 })).toMatchObject({ success: true });
        const updated = await prisma.savings_goal.findUniqueOrThrow({ where: { id: goal.id } });
        expect(updated.name).toBe("Horno Industrial");
    });

    it("contributions accumulate and auto-complete the goal", async () => {
        loginAs("ADMIN", adminId);
        const goal = await prisma.savings_goal.findFirstOrThrow({ where: { name: "Horno Industrial" } });

        expect(await addContribution(goal.id, 150, "primer abono")).toMatchObject({ success: true });
        let progress = (await getGoalsWithProgress()).find((g) => g.id === goal.id)!;
        expect(progress.currentAmount).toBe(150);
        expect(progress.status).toBe("ACTIVE");

        expect(await addContribution(goal.id, 60)).toMatchObject({ success: true });
        progress = (await getGoalsWithProgress()).find((g) => g.id === goal.id)!;
        expect(progress.currentAmount).toBe(210);
        expect(progress.status).toBe("COMPLETED");
    });

    it("cancelGoal marks the goal cancelled keeping its history", async () => {
        loginAs("ADMIN", adminId);
        const goal = await prisma.savings_goal.create({ data: { name: "Meta cancelable", targetAmount: 500 } });

        expect(await cancelGoal(goal.id)).toMatchObject({ success: true });
        const row = await prisma.savings_goal.findUniqueOrThrow({ where: { id: goal.id } });
        expect(row.status).toBe("CANCELLED");
        expect(await prisma.goal_contribution.count({ where: { goalId: goal.id } })).toBe(0);
    });

    it("fails movements when no jornada is open", async () => {
        loginAs("ADMIN", adminId);
        await prisma.jornada.update({ where: { id: jornadaId }, data: { status: "CLOSED" } });

        expect(await saveMovement(10, "DEPOSIT")).toMatchObject({ success: false, message: "NO_OPEN_JORNADA" });

        await prisma.jornada.update({ where: { id: jornadaId }, data: { status: "OPEN" } });
    });

    it("read actions are empty without a session", async () => {
        logout();
        expect(await getPoolBalance()).toEqual({ balance: 0, deposited: 0, withdrawn: 0 });
        expect(await getRecentMovements()).toEqual({ items: [], hasMore: false });
        expect(await getGoalsWithProgress()).toEqual([]);
    });
});
