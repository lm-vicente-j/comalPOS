"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";

export async function saveSalaryPayment(data: {userID: number ;amount: number; period: string;}) {
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
  try {
    const history = await prisma.salary.findMany({
      where: { userID },
      orderBy: { payDate: "desc" },
    });
    return history;
  } catch (error) {
    console.error(error);
    return [];
  }
}