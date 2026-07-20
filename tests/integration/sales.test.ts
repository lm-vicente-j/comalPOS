import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { loginAs, logout, resetDb, seedBase } from "./helpers";
import {
    cancelSaleAction,
    closeAccountAction,
    createSale,
    updateSaleQuantity,
} from "@/lib/actions/sales";

describe("sales actions", () => {
    let adminId: number;
    let jornadaId: number;
    let supplyId: number;
    let productId: number;
    let customerId: number;

    beforeAll(async () => {
        await resetDb();
        const { admin, jornada } = await seedBase();
        adminId = admin.id;
        jornadaId = jornada.id;

        const supply = await prisma.supplies.create({
            data: { name: "Masa", measureUnit: "kg", currentStock: 100, unitCost: 5 },
        });
        supplyId = supply.id;

        const product = await prisma.products.create({
            data: {
                name: "Sope",
                price: 50,
                recipes: { create: [{ supplyID: supplyId, quantityUsed: 2 }] },
            },
        });
        productId = product.id;

        const customer = await prisma.customer.create({
            data: { customerName: "Cliente Venta", phone: "123", currentBalance: 0 },
        });
        customerId = customer.id;
    });

    it("rejects createSale without a session", async () => {
        logout();
        const res = await createSale([{ productID: productId, quantity: 1 }], "PAID", "VENTA_LIBRE", -1);
        expect(res).toMatchObject({ success: false, error: "UNAUTHORIZED" });
        expect(await prisma.sales.count()).toBe(0);
    });

    it("creates a sale with items, totals and stock decrement", async () => {
        loginAs("ADMIN", adminId);
        const res = await createSale([{ productID: productId, quantity: 2 }], "PAID", "VENTA_LIBRE", -1, "CASH");
        expect(res).toMatchObject({ success: true });

        const sale = await prisma.sales.findFirstOrThrow({ include: { sale_items: true } });
        expect(Number(sale.total)).toBe(100);
        expect(sale.status).toBe("PAID");
        expect(sale.payment_method).toBe("CASH");
        expect(sale.jornadaId).toBe(jornadaId);
        expect(sale.placedBy).toBe(adminId);
        expect(sale.sale_items).toHaveLength(1);
        expect(sale.sale_items[0].quantity).toBe(2);
        expect(Number(sale.sale_items[0].unitPrice)).toBe(50);
        expect(Number(sale.sale_items[0].subtotal)).toBe(100);

        // recipe uses 2 per unit -> 2 units * 2 = 4 consumed
        const supply = await prisma.supplies.findUniqueOrThrow({ where: { id: supplyId } });
        expect(Number(supply.currentStock)).toBe(96);
    });

    it("registers a debtor entry when the sale goes to debt", async () => {
        loginAs("ADMIN", adminId);
        const res = await createSale([{ productID: productId, quantity: 1 }], "DEBT", `CL- Cliente Venta`, customerId);
        expect(res).toMatchObject({ success: true });

        const saleId = (res as { saleId: number }).saleId;
        const sale = await prisma.sales.findUniqueOrThrow({ where: { id: saleId } });
        expect(sale.status).toBe("DEBT");
        expect(sale.payment_method).toBeNull();

        const debtor = await prisma.debtors.findUniqueOrThrow({ where: { saleID: saleId } });
        expect(debtor.customerID).toBe(customerId);
        expect(Number(debtor.amount)).toBe(50);
        expect(debtor.status).toBe("DEBT");

        const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
        expect(customer.lastConsumption).not.toBeNull();
        expect(Number(customer.currentBalance)).toBe(50);
    });

    it("keeps a table order UNPAID until the account is closed", async () => {
        loginAs("ADMIN", adminId);
        const res = await createSale([{ productID: productId, quantity: 1 }], "UNPAID", "MESA_2", -1);
        expect(res).toMatchObject({ success: true });

        const saleId = (res as { saleId: number }).saleId;
        const sale = await prisma.sales.findUniqueOrThrow({ where: { id: saleId } });
        expect(sale.status).toBe("UNPAID");
        // The method is only known when the account is actually settled.
        expect(sale.payment_method).toBeNull();

        const close = await closeAccountAction("MESA_2", "TRANSFER");
        expect(close).toMatchObject({ success: true });

        const paid = await prisma.sales.findUniqueOrThrow({ where: { id: saleId } });
        expect(paid.status).toBe("PAID");
        expect(paid.payment_method).toBe("TRANSFER");
    });

    it("updateSaleQuantity adjusts item, totals and stock", async () => {
        loginAs("ADMIN", adminId);
        const sale = await prisma.sales.findFirstOrThrow({ orderBy: { id: "asc" } });
        const stockBefore = Number(
            (await prisma.supplies.findUniqueOrThrow({ where: { id: supplyId } })).currentStock
        );

        // quantity 2 -> 3: one extra unit consumes 2 more of the supply
        const res = await updateSaleQuantity(sale.id, 3, productId);
        expect(res).toMatchObject({ success: true });

        const item = await prisma.sale_items.findFirstOrThrow({ where: { saleID: sale.id, productID: productId } });
        expect(item.quantity).toBe(3);
        expect(Number(item.subtotal)).toBe(150);

        const updatedSale = await prisma.sales.findUniqueOrThrow({ where: { id: sale.id } });
        expect(Number(updatedSale.total)).toBe(150);

        const supply = await prisma.supplies.findUniqueOrThrow({ where: { id: supplyId } });
        expect(Number(supply.currentStock)).toBe(stockBefore - 2);
    });

    it("cancelSaleAction marks the sale cancelled and replenishes stock", async () => {
        loginAs("ADMIN", adminId);
        const sale = await prisma.sales.findFirstOrThrow({ orderBy: { id: "asc" } });
        const stockBefore = Number(
            (await prisma.supplies.findUniqueOrThrow({ where: { id: supplyId } })).currentStock
        );

        const res = await cancelSaleAction(sale.id);
        expect(res).toMatchObject({ success: true });

        const cancelled = await prisma.sales.findUniqueOrThrow({ where: { id: sale.id } });
        expect(cancelled.status).toBe("CANCELLED");

        // 3 units * 2 per unit replenished
        const supply = await prisma.supplies.findUniqueOrThrow({ where: { id: supplyId } });
        expect(Number(supply.currentStock)).toBe(stockBefore + 6);
    });

    it("closeAccountAction pays every unpaid sale of a source", async () => {
        loginAs("ADMIN", adminId);
        await prisma.sales.create({
            data: {
                total: 70, status: "UNPAID", source_type: "MESA_4", placedBy: adminId, jornadaId,
            },
        });

        const res = await closeAccountAction("MESA_4", "TRANSFER");
        expect(res).toMatchObject({ success: true });

        const rows = await prisma.sales.findMany({ where: { source_type: "MESA_4" } });
        expect(rows.every((r) => r.status === "PAID" && r.payment_method === "TRANSFER")).toBe(true);
    });

    it("closeAccountAction leaves orphan unpaid sales of past jornadas untouched", async () => {
        loginAs("ADMIN", adminId);

        // An unpaid sale stranded in an already-closed jornada for the same table.
        const closedJornada = await prisma.jornada.create({
            data: { openedBy: adminId, openingAmount: 100, status: "CLOSED", closedAt: new Date(), closedBy: adminId },
        });
        const orphan = await prisma.sales.create({
            data: { total: 99, status: "UNPAID", source_type: "MESA_7", placedBy: adminId, jornadaId: closedJornada.id },
        });
        // Today's account on the same table, in the open jornada.
        const current = await prisma.sales.create({
            data: { total: 40, status: "UNPAID", source_type: "MESA_7", placedBy: adminId, jornadaId },
        });

        const res = await closeAccountAction("MESA_7", "CASH");
        expect(res).toMatchObject({ success: true });

        const orphanAfter = await prisma.sales.findUniqueOrThrow({ where: { id: orphan.id } });
        expect(orphanAfter.status).toBe("UNPAID");
        expect(orphanAfter.payment_method).toBeNull();

        const currentAfter = await prisma.sales.findUniqueOrThrow({ where: { id: current.id } });
        expect(currentAfter.status).toBe("PAID");
        expect(currentAfter.payment_method).toBe("CASH");
    });

    it("closeAccountAction fails with NO_OPEN_JORNADA when none is open", async () => {
        loginAs("ADMIN", adminId);
        await prisma.jornada.updateMany({ where: { status: "OPEN" }, data: { status: "CLOSED" } });

        const res = await closeAccountAction("MESA_7", "CASH");
        expect(res).toMatchObject({ success: false, message: "NO_OPEN_JORNADA" });

        await prisma.jornada.update({ where: { id: jornadaId }, data: { status: "OPEN" } });
    });

    it("fails with NO_OPEN_JORNADA when the jornada is closed", async () => {
        loginAs("ADMIN", adminId);
        await prisma.jornada.update({ where: { id: jornadaId }, data: { status: "CLOSED" } });

        const res = await createSale([{ productID: productId, quantity: 1 }], "PAID", "VENTA_LIBRE", -1);
        expect(res.success).toBe(false);

        await prisma.jornada.update({ where: { id: jornadaId }, data: { status: "OPEN" } });
    });
});
