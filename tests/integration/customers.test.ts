import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { loginAs, logout, resetDb, seedBase } from "./helpers";
import { getAllCustomers, saveCustomer } from "@/lib/actions/customers";

describe("customers actions", () => {
    beforeAll(async () => {
        await resetDb();
        await seedBase();
    });

    it("rejects saveCustomer without a session and writes nothing", async () => {
        logout();
        const res = await saveCustomer({ customerName: "Juan Cliente", phone: "5551234" });
        expect(res).toMatchObject({ success: false, error: "UNAUTHORIZED" });
        expect(await prisma.customer.count()).toBe(0);
    });

    it("creates a customer and persists it", async () => {
        loginAs("ADMIN");
        const res = await saveCustomer({ customerName: "Juan Cliente", phone: "5551234" });
        expect(res).toMatchObject({ success: true });

        const row = await prisma.customer.findFirst({ where: { customerName: "Juan Cliente" } });
        expect(row).not.toBeNull();
        expect(row!.phone).toBe("5551234");
        expect(Number(row!.currentBalance)).toBe(0);
        expect(row!.registeredDate).not.toBeNull();
    });

    it("updates an existing customer by id", async () => {
        loginAs("ADMIN");
        const existing = await prisma.customer.findFirstOrThrow();

        const res = await saveCustomer({ id: existing.id, customerName: "Juan Editado", phone: "999888" });
        expect(res).toMatchObject({ success: true });

        const row = await prisma.customer.findUniqueOrThrow({ where: { id: existing.id } });
        expect(row.customerName).toBe("Juan Editado");
        expect(row.phone).toBe("999888");
        expect(await prisma.customer.count()).toBe(1);
    });

    it("rejects invalid data with field errors", async () => {
        loginAs("ADMIN");
        const res = await saveCustomer({ customerName: "ab", phone: "" });
        expect(res.success).toBe(false);
        expect(res.fieldErrors).toBeDefined();
        expect(await prisma.customer.count()).toBe(1);
    });

    it("getAllCustomers returns rows with a session and nothing without one", async () => {
        loginAs("ADMIN");
        const rows = await getAllCustomers();
        expect(rows.length).toBe(1);

        logout();
        expect(await getAllCustomers()).toEqual([]);
    });
});
