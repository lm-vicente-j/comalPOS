"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { success, z } from "zod";
import { auth } from "../auth";

const SupplySchema = z.object({
  id: z.number().int().optional(),
  
  name: z.string().nullable(),
  
  measureUnit: z.string().nullable(),
  
  currentStock: z.number(),
  
  unitCost: z.number(),

  recipes: z.array(
    z.object({
      productID: z.number().int(),
      supplyID: z.number().int(),
      quantityUsed: z.number().nullable(), 
    })
  ).optional(),
});

export type Supply = z.infer<typeof SupplySchema>;

export async function saveSupply(data: Supply) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false,error: "PERMISSION DENIED" };

    const result = SupplySchema.safeParse(data);
    if (!result.success) return {  success: false, error: "INVALID DATA" };

    const { id, name, measureUnit, currentStock, unitCost } = result.data;

    try {
        await prisma.supplies.upsert({
            where: { id: id ?? -1 },
            update: { name, measureUnit, currentStock, unitCost },
            create: { name, measureUnit, currentStock, unitCost },
        });
        revalidatePath("/admin/inventory");
        return { success: true };
    } catch (e) {
        return {  success: false, error: "INTERNAL ERROR" };
    }
}

export async function getSuppliesData() {
    try {
        return await prisma.supplies.findMany({ orderBy: { name: 'asc' } });
    } catch (e) {
        return [];
    }
}