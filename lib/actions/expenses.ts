"use server";
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { BillSchema } from "./schemas";

export async function saveExpense(data: {
  amount: number;
  category: string;
  description: string;
  date: Date;
  registered_by: number;
}) {
  try {
    await prisma.bill.create({
      data: {
        amount: data.amount,
        category: data.category,
        description: data.description,
        date: data.date,
        registered_by: data.registered_by,
      },
    });
    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function getExpenses() {
  const rows = await prisma.bill.findMany({
    orderBy: { date: 'desc' },
    include: { users: { select: { name: true } } }
  });
    return rows.map((row) => BillSchema.parse(row));
}