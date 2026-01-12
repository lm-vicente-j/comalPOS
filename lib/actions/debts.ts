"use server"
import z from "zod"
import prisma from "../prisma"

const DebtorSchema = z.object({
    id: z.number(),
    saleID: z.number().nullable(),
    customerID: z.number().nullable(),
    amount: z.number(),
    status: z.string().nullable(),

    customer: z.object({
        id: z.number(),
        customerName: z.string().nullable(),
        phone: z.string().nullable(),
        alias: z.string().nullable(),
        lastConsumption: z.date().nullable(),
        currentBalance: z.number(),
        registeredDate: z.date().nullable(),
    }).nullable(),

    sales: z.array(
        z.object({
            id: z.number(),
            total: z.number().nullable(),
            status: z.string().nullable(),
            source_type: z.string().nullable(),
            customerID: z.number().nullable(),
            placedBy: z.number().nullable(),
            createdAt: z.date().nullable(),
        })
    ).optional(),
});

export type Debtor = z.infer<typeof DebtorSchema>

export async function getAllDebtors() {

    try {
        const debts = await prisma.debtors.findMany({
            where: {
                status: "UNPAID"
            },
            include: {
                customer: true,
                sales: true
            },
            orderBy: {
                amount: 'desc'
            }
        });
        return debts;
    } catch (e) {
        console.error(e);
        return [];
    }

}

export async function getDebtsSummary() {
    try {
        const allDebts = await prisma.debtors.findMany({
            where: { status: "UNPAID" }
        });

        const totalAmount = allDebts.reduce((acc, curr) => acc + curr.amount, 0);
        const activeDebtors = new Set(allDebts.map(d => d.customerID)).size;
        
        return {
            totalAmount,
            activeDebtors,
            todayPayments: 0
        };
    } catch (e) {
        return { totalAmount: 0, activeDebtors:0, todayPayments: 0};
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