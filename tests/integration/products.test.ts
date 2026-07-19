import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { loginAs, logout, resetDb, seedBase } from "./helpers";
import { deleteProduct, getProductsData, saveProduct } from "@/lib/actions/products";

describe("products actions", () => {
    let supplyId: number;

    beforeAll(async () => {
        await resetDb();
        await seedBase();
        const supply = await prisma.supplies.create({
            data: { name: "Tortilla", measureUnit: "pz", currentStock: 100, unitCost: 1 },
        });
        supplyId = supply.id;
    });

    it("rejects saveProduct for non-admin sessions", async () => {
        logout();
        expect(await saveProduct({ name: "Taco", price: 25 })).toMatchObject({ success: false, error: "PERMISSION DENIED" });
        loginAs("STAFF");
        expect(await saveProduct({ name: "Taco", price: 25 })).toMatchObject({ success: false, error: "PERMISSION DENIED" });
        expect(await prisma.products.count()).toBe(0);
    });

    it("creates a product with its recipe", async () => {
        loginAs("ADMIN");
        const res = await saveProduct({ name: "Taco", price: 25, recipes: [{ supplyID: supplyId, quantityUsed: 2 }] });
        expect(res).toMatchObject({ success: true });

        const row = await prisma.products.findFirstOrThrow({ where: { name: "Taco" }, include: { recipes: true } });
        expect(Number(row.price)).toBe(25);
        expect(row.recipes).toHaveLength(1);
        expect(row.recipes[0].supplyID).toBe(supplyId);
        expect(Number(row.recipes[0].quantityUsed)).toBe(2);
    });

    it("updates a product replacing its recipes", async () => {
        loginAs("ADMIN");
        const existing = await prisma.products.findFirstOrThrow({ where: { name: "Taco" } });

        const res = await saveProduct({ id: existing.id, name: "Taco Especial", price: 30, recipes: [] });
        expect(res).toMatchObject({ success: true });

        const row = await prisma.products.findUniqueOrThrow({ where: { id: existing.id }, include: { recipes: true } });
        expect(row.name).toBe("Taco Especial");
        expect(Number(row.price)).toBe(30);
        expect(row.recipes).toHaveLength(0);
        expect(await prisma.products.count()).toBe(1);
    });

    it("rejects invalid data with field errors", async () => {
        loginAs("ADMIN");
        const res = await saveProduct({ name: "ab", price: -1 });
        expect(res.success).toBe(false);
        expect(res.fieldErrors).toBeDefined();
    });

    it("deletes a product without recipes", async () => {
        loginAs("ADMIN");
        const existing = await prisma.products.findFirstOrThrow({ where: { name: "Taco Especial" } });

        expect(await deleteProduct(existing.id)).toMatchObject({ success: true });
        expect(await prisma.products.findUnique({ where: { id: existing.id } })).toBeNull();
    });

    it("refuses to delete a product that still has recipes", async () => {
        loginAs("ADMIN");
        await saveProduct({ name: "Quesadilla", price: 35, recipes: [{ supplyID: supplyId, quantityUsed: 1 }] });
        const row = await prisma.products.findFirstOrThrow({ where: { name: "Quesadilla" } });

        const res = await deleteProduct(row.id);
        expect(res.success).toBe(false);
        expect(await prisma.products.findUnique({ where: { id: row.id } })).not.toBeNull();
    });

    it("getProductsData is empty without a session", async () => {
        logout();
        expect(await getProductsData()).toEqual([]);
    });
});
