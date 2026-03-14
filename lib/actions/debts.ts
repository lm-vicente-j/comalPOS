"use server"
import z from "zod"
import prisma from "../prisma"
import { Sale } from "./sales";
import { revalidatePath } from "next/cache";
import { PaymentMethod, SaleStatus } from "@/app/generated/prisma/enums";

const DebtorSchema = z.object({
    id: z.number(),
    saleID: z.number().nullable(),
    customerID: z.number().nullable(),
    amount: z.number(),
    status: z.enum(["UNPAID", "PAID", "DEBT", "CANCELLED"]),


    customer: z.object({
        id: z.number(),
        customerName: z.string().nullable(),
        phone: z.string().nullable(),
        alias: z.string().nullable(),
        lastConsumption: z.date().nullable(),
        currentBalance: z.number(),
        registeredDate: z.date().nullable(),
    }).nullable(),

    sales: z.array(z.object({
        id: z.number(),
        total: z.number().nullable(),
        status: z.enum(["UNPAID", "PAID", "DEBT", "CANCELLED"]),
        source_type: z.string().nullable(),
        customerID: z.number().nullable(),
        placedBy: z.number().nullable(),
        createdAt: z.date().nullable(),
    })).optional(),
});

export type Debtor = z.infer<typeof DebtorSchema>

export async function getAllDebtors() {
    try {
        const rawDebts = await prisma.debtors.findMany({
            where: {
                status: SaleStatus.DEBT
            },
            include: {
                customer: true,
                sales: true 
            },
            orderBy: {
                amount: 'desc'
            }
        });

        const groupedDebtorsMap = new Map();

        rawDebts.forEach((debt) => {
            const customerId = debt.customerID;

            if (!groupedDebtorsMap.has(customerId)) {
                groupedDebtorsMap.set(customerId, {
                    id: debt.id, 
                    customerID: customerId,
                    amount: Number(debt.amount), 
                    status: debt.status,
                    customer: debt.customer,
                    sales: debt.sales ? [debt.sales] : [] 
                });
            } else {
                
                const existing = groupedDebtorsMap.get(customerId);
                existing.amount += Number(debt.amount);
                if (debt.sales) {
                    existing.sales.push(debt.sales);
                }
            }
        });

        
        return Array.from(groupedDebtorsMap.values());

    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getDebtsSummary() {
    try {
        const allDebts = await prisma.debtors.findMany({
            where: { status: "DEBT" }
        });

        const totalAmount = allDebts.reduce((acc, curr) => acc + curr.amount.toNumber(), 0);
        const activeDebtors = new Set(allDebts.map(d => d.customerID)).size;

        return {
            totalAmount,
            activeDebtors,
            todayPayments: 0
        };
    } catch (e) {
        return { totalAmount: 0, activeDebtors: 0, todayPayments: 0 };
    }
}


export async function getDebtorHistory(id: any) {


    try {
        const debts = await prisma.debtors.findUnique({
            where: { id: id }
        });

        return debts

    } catch (e) {
        return { success: false, error: "ERROR IN DB" }
    }


}

export async function toDebt(customerId: number, sales: Sale[]) {



    try {

        const totalNewDebt = sales.reduce((sum, s) => sum + Number(s.total), 0);

        const operations: any[] = [];

        sales.forEach((s) => {
            const debtorData = {
                saleID: s.id,
                customerID: customerId,
                amount: s.total,
                status: SaleStatus.DEBT,
            };


            operations.push(
                prisma.debtors.upsert({
                    where: { saleID: s.id },
                    update: debtorData,
                    create: debtorData,
                })
            );

            operations.push(
                prisma.sales.update({
                    where: { id: s.id },
                    data: {
                        status: "DEBT",
                        customerID: customerId
                    }
                })
            );

        })
        operations.push(
            prisma.customer.update({
                where: { id: customerId },
                data: {
                    currentBalance: { increment: totalNewDebt }
                }
            })
        );
        await prisma.$transaction(operations)
        revalidatePath("/pos")
        revalidatePath("/debtors")
        return { msg: "SUCCESS" }


    } catch (e) {
        console.error(e);
        return { msg: "INTERNAL ERROR", error: e };
    }

}

export async function payAccount(customerID: number, sales: Sale[], paymentMethod: PaymentMethod) {
    try {

        const operations: any[] = []

        sales.forEach((s) => {
            const debtorData = {
                status: SaleStatus.PAID,
            }

            operations.push(
                prisma.debtors.update({
                    where: { saleID: s.id },
                    data: debtorData
                })


            );

            operations.push(
                prisma.sales.update({
                    where: { id: s.id },
                    data: { status: SaleStatus.PAID, payment_method: paymentMethod }
                })
            )
        })
        const totalNewDebt = sales.reduce((sum, s) => sum + Number(s.total), 0);

        operations.push(
            prisma.customer.update({
                where: { id: customerID },
                data: {
                    currentBalance: { decrement: totalNewDebt }
                }
            })
        );



        await prisma.$transaction(operations)

        revalidatePath("/pos")
        revalidatePath("/debtors")
        return { msg: "SUCCESS" }

    } catch (e) {
        console.error(e);
        return { msg: "INTERNAL ERROR", error: e }
    }
}