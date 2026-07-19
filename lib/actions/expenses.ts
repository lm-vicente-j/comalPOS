"use server";
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { BillSchema } from "./schemas";
import { auth } from "../auth";
import z from "zod";

export async function saveExpense(data: {
  amount: number;
  category: string;
  description: string;
  date: Date;
  registered_by: number;
}) {

  const session = await auth();
  if (!session?.user) return { success: false, error: "UNAUTHORIZED" };

  const activeJornada = await prisma.jornada.findFirst({
    where: { status: "OPEN" }
  });

  if (!activeJornada) {
    return { success: false, error: "NO_OPEN_JORNADA" };
  }

  const parsed = BillSchema.omit({ id: true, receiptUrl: true }).safeParse(data);


  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: z.flattenError(parsed.error).fieldErrors
    };
  }

  try {
    await prisma.bill.create({
      data: {
        amount: data.amount,
        category: data.category,
        description: data.description,
        date: data.date,
        registered_by: data.registered_by,
        jornadaId: activeJornada.id
      },
    });
    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    console.log(error)
    return { success: false, error: String(error) };
  }
}

// Paginated: fetches one page of bills plus the all-time total so the
// summary card stays accurate while the list loads incrementally.
export async function getExpenses(offset = 0, limit = 30) {
  const session = await auth();
  if (!session?.user) return { items: [], total: 0, hasMore: false };

  const [rows, totals] = await Promise.all([
    prisma.bill.findMany({
      orderBy: { date: 'desc' },
      skip: offset,
      // One extra row just to know whether another page exists.
      take: limit + 1,
    }),
    prisma.bill.aggregate({ _sum: { amount: true } }),
  ]);

  return {
    items: rows.slice(0, limit).map((row) => BillSchema.parse(row)),
    total: Number(totals._sum.amount ?? 0),
    hasMore: rows.length > limit,
  };
}