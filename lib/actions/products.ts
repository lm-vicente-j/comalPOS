"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { auth } from "../auth";
import { ProductSchema, type Product } from "./schemas";
import z from "zod";

export async function saveProduct(data: Product) {
    // Check role
    const session = await auth();
    const role = session?.user?.role || "NONE";

    if (role != "ADMIN") return { success: false, error: "PERMISSION DENIED" };

    const parsedData = {
        ...data,
        price: Number(data.price)
    };

    const result = ProductSchema.safeParse(parsedData);
    if (!result.success) {
        return {
            success: false,
            error: "Datos inválidos",
            fieldErrors: z.flattenError(result.error).fieldErrors
        };
    }

    let { id, name, price, recipes } = data;
    id = id == undefined ? -1 : id;

    // The sale price can never fall below the recipe's base cost.
    if (recipes && recipes.length > 0) {
        const supplyRows = await prisma.supplies.findMany({
            where: { id: { in: recipes.map(r => r.supplyID) } },
            select: { id: true, unitCost: true }
        });
        const costById = new Map(supplyRows.map(s => [s.id, Number(s.unitCost)]));
        const baseCost = recipes.reduce((acc, r) => acc + (costById.get(r.supplyID) ?? 0) * r.quantityUsed, 0);

        if (price < baseCost) {
            return {
                success: false,
                error: "Datos inválidos",
                fieldErrors: { price: ["El precio de venta no puede ser menor al costo base."] }
            };
        }
    }

    try {
        await prisma.products.upsert({
            where: { id: id },
            update: {
                name,
                price,
                // Leave the stored recipe untouched when the caller omits it.
                ...(recipes !== undefined && {
                    recipes: {
                        deleteMany: {},
                        create: recipes.map(r => ({
                            supplyID: r.supplyID,
                            quantityUsed: r.quantityUsed
                        }))
                    }
                })
            },
            create: {
                name,
                price,
                recipes: {
                    create: recipes?.map(r => ({
                        supplyID: r.supplyID,
                        quantityUsed: r.quantityUsed
                    }))
                }
            },
        });


        revalidatePath("/pos")
        revalidatePath("/admin/inventory")
        return { success: true }
    } catch (e) {

        return { success: false, error: "ERROR IN UPSERT OPERATION" }
    }

}

export async function deleteProduct(id: number) {
    // Check role
    const session = await auth();
    const role = session?.user?.role || "NONE";

    if (role != "ADMIN") {
        return {
            error: "PERMISSION DENIED"
        }
    }

    try {
        await prisma.products.delete({ where: { id } })
        revalidatePath("/pos")
        revalidatePath("/pos/inventory")
        return { success: true }
    } catch (e) {
        return { success: false, error: "ERROR, ASSOCIATED RECIPE    " }
    }

}

export async function getProductsData() {

    const session = await auth();
    if (!session?.user) return [];

    try {
        return await prisma.products.findMany({
            include: {
                recipes: {
                    include: { supplies: true }
                }
            },
            orderBy: { name: 'asc' }
        });


    } catch (e) {
        return { success: false, error: "ERROR IN DB" }
    }


} 