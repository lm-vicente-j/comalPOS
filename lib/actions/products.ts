"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "../auth";

const ProductSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(3, "3 characters min."),
    price: z.number().positive("The price must be greater than zero."),
    sale_items: z.array(z.object({
        id: z.number().int(),
        saleID: z.number().int(),
        productID: z.number().int(),
        quantity: z.number().int(),
        unitPrice: z.number(),
        subtotal: z.number(),
    })).optional()
})

export type Product = z.infer<typeof ProductSchema>;

export async function saveProduct(data: Product) {

    // Check role
    const session = await auth();
    const role = session?.user?.role || "NONE";

    if (role != "ADMIN") {
        return {
            error: "PERMISSION DENIED"
        }
    }

    const result = ProductSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: z.treeifyError(result.error) };
    }

    const { id, name, price } = result.data;
    try {
        await prisma.products.upsert({
            where: { id: id ?? -1 },
            update: { name, price },
            create: { name, price },
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

    try {
        const products = await prisma.products.findMany({
            orderBy: { name: 'asc' }
        });

        return products
    
    }catch(e){
        return {success: false, error: "ERROR IN DB"}
    }


} 