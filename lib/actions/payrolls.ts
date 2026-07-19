"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { SalarySchema } from "./schemas";
import { auth } from "../auth";
import z from "zod";

export async function saveSalaryPayment(data: { userID: number; amount: number; period: string; }) {

  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = SalarySchema.omit({ id: true, payDate: true }).safeParse(data);
  
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: z.flattenError(parsed.error).fieldErrors
    };
  }

  try {
    await prisma.salary.create({
      data: {
        userID: data.userID,
        amount: data.amount,
        period: data.period,
        payDate: new Date(),
      },
    });
    revalidatePath("/admin/roster");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function getSalaryHistory(userID: number) {
  const session = await auth();
  if (!session?.user) return [];

  try {
    const history = await prisma.salary.findMany({
      where: { userID },
      orderBy: { payDate: "desc" },
    });
    return history.map((row) => SalarySchema.parse(row));

  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getUserPayrollInfo(userID: number) {
  const session = await auth();
  if (!session?.user) return null;

  try {
    const user = await prisma.users.findUnique({
      where: { id: userID },
      select: { name: true, registeredAt: true }
    });
    return user;
  } catch (error) {
    return null;
  }
}