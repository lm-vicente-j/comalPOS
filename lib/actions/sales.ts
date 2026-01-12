"use server"

import z, { success, treeifyError } from "zod";
import prisma from "../prisma";
import { revalidatePath } from "next/cache";

const SaleSchema = z.object({
    id: z.number().int(),
    customerID: z.number().int(),
    placedBy: z.number().int(),
    status: z.enum(["PAID", "DEBT", "CANCELLED"]),
    source_type: z.string(),

    total: z.number().or(z.string()),
    createdAt: z.date().optional().or(z.string()),

    sale_items: z.array(
        z.object({
            productID: z.number().int(),
            quantity: z.number().int(),
            unitPrice: z.number().or(z.string()),
            subtotal: z.number().or(z.string()),
            products: z.object({
                id: z.number(),
                name: z.string(),
                price: z.number()
            }).nullable().optional()
        })
    )
});

export type Sale = z.infer<typeof SaleSchema>;

export async function createSale(sale_items: { productID: number, quantity: number }[], status: any, source_type: any, customerID: number, placedBy: number) {
    try {
        return await prisma.$transaction(async (tx) => {
            let totalSale = 0;

            // calulate sale total and check stock/sales
            const itemsToInsert = []

            for (const item of sale_items) {
                const product = await tx.products.findUnique({
                    where: { id: item.productID },
                    include: { recipes: true }
                })

                if (!product) throw new Error("PRODUCT ID" + item.productID + " NOT FOUND");

                const subtotal = product.price * item.quantity;
                totalSale += subtotal;

                itemsToInsert.push({
                    productID: item.productID,
                    quantity: item.quantity,
                    unitPrice: product.price,
                    subtotal: subtotal
                })


                //// INVENTORY
                for (const recipe of product.recipes) {
                    if (recipe.quantityUsed) {
                        const quantity = Number(recipe.quantityUsed) * item.quantity;
                        await tx.supplies.update({
                            where: { id: recipe.supplyID },
                            data: { currentStock: { decrement: quantity } }
                        })
                    }
                }
            }

            // REGISTER SALE
            const newSale = await tx.sales.create({
                data: {
                    total: totalSale,
                    status: status,
                    source_type: source_type,
                    customerID: (customerID === -1 || !customerID) ? null : customerID,
                    placedBy: placedBy,
                    sale_items: {
                        create: itemsToInsert
                    }
                }
            });

            // Register debtors
            if (status === "DEBT" && customerID) {
                await tx.debtors.create({
                    data: {
                        id: newSale.id,
                        saleID: newSale.id,
                        customerID: customerID,
                        amount: totalSale,
                        status: "UNPAID"
                    }
                });
            }
            revalidatePath("/pos")
            revalidatePath("/debtors")
            return { success: true, saleId: newSale.id };

        })
    } catch (e) {
        console.log(placedBy)
        return { success: false, message: "INTERNAL ERROR" }
    }
}

export async function closeAccountAction(sourceType: string) {
    try {
        await prisma.sales.updateMany({
            where: {
                source_type: sourceType,
                status: "UNPAID"
            },
            data: {
                status: "PAID"
            }
        });

        revalidatePath("/pos");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: "Error al cerrar la cuenta" };
    }
}

export async function getSalesHistory() {
    const sales = await prisma.sales.findMany({
        include: {
            customer: true,
            user: true,
            sale_items: {
                include: { products: true }
            }
        },
        orderBy: { createdAt: 'desc' }

    });

    return sales.map(s => ({
        ...s,
        total: Number(s.total),
        createdAt: s.createdAt?.toISOString(),
        itemsCount: s.sale_items.length
    }))
}

export async function getTodaySalesHistory() {
    const sales = await prisma.sales.findMany({
        where: {
            NOT: {
                status: {
                    equals: "CANCELLED"
                }
            }
        },
        include: {
            customer: true,
            user: true,
            sale_items: {
                include: { products: true }
            }
        },
        orderBy: { createdAt: 'desc' }

    });

    return sales.map(s => ({
        ...s,
        total: Number(s.total),
        createdAt: s.createdAt?.toISOString(),
        itemsCount: s.sale_items.length
    }))
}

export async function cancelSaleAction(saleId: number) {
    try {
        return await prisma.$transaction(async (tx) => {
            const sale = await tx.sales.findUnique({
                where: { id: saleId },
                include: { sale_items: { include: { products: { include: { recipes: true } } } } }
            });

            if (!sale || sale.status === "CANCELLED") return { error: "INVALID SALE" };

            // Replenish inventory
            for (const item of sale.sale_items) {
                for (const recipe of item.products?.recipes || []) {
                    const quantity = Number(recipe.quantityUsed) * (item.quantity || 0);
                    await tx.supplies.update({
                        where: { id: recipe.supplyID },
                        data: { currentStock: { increment: quantity } }
                    });
                }
            }

            await tx.sales.update({
                where: { id: saleId },
                data: { status: "CANCELLED" }
            });

            revalidatePath("/pos");
            revalidatePath("/admin/inventory");
            return { success: true };
        });
    } catch (error) {
        return { success: false, error: "INTERNAL ERROR" };
    }
}

export async function updateSaleQuantity(saleId: number, quantity: number, productId: number) {
    try {
        // CANCELL SALE
        if (quantity < 1) {
            cancelSaleAction(saleId)
            return { success: true, message: "PRODUCT CANCELLED" }
        }

        return await prisma.$transaction(async (tx) => {
            const currentItem = await tx.sale_items.findFirst({
                where: { saleID: saleId, productID: productId },
                include: { products: { include: { recipes: true } } }
            });

            if (!currentItem || !currentItem.products) throw new Error("NOT FOUND ITEM");

            const oldQuantity = currentItem.quantity ? currentItem.quantity : 0;
            const quantityDiff = quantity - oldQuantity;

            for (const recipe of currentItem.products.recipes) {
                if (recipe.quantityUsed) {
                    const totalAdjustment = Number(recipe.quantityUsed) * quantityDiff;
                    await tx.supplies.update({
                        where: { id: recipe.supplyID },
                        data: { currentStock: { decrement: totalAdjustment } }
                    });
                }
            }

            const newSubtotal = currentItem.unitPrice * quantity;
            await tx.sale_items.updateMany({
                where: { saleID: saleId, productID: productId },
                data: {
                    quantity: quantity,
                    subtotal: newSubtotal
                }
            });

            const allItems = await tx.sale_items.findMany({
                where: { saleID: saleId }
            });
            const newTotalSale = allItems.reduce((acc, item) => acc + Number(item.subtotal), 0);

            await tx.sales.update({
                where: { id: saleId },
                data: { total: newTotalSale }
            });

            revalidatePath("/pos");
            return { success: true };
        });
    } catch (e) {
        console.error(e);
        return { success: false, message: "Error al actualizar cantidad" };
    }
}