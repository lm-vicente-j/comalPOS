"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { auth } from "../auth";

// Lightweight check used by the UI to disable controls that need an open jornada.
export async function hasOpenJornada() {
    const session = await auth();
    if (!session?.user) return false;

    const jornada = await prisma.jornada.findFirst({
        where: { status: "OPEN" },
        select: { id: true }
    });
    return !!jornada;
}

export async function openJornada(openingAmount: number) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "PERMISSION DENIED" };
    }

    if (!Number.isFinite(openingAmount) || openingAmount < 0) {
        return { success: false, error: "Monto inicial inválido" };
    }

    const pending = await prisma.jornada.findFirst({
        where: { status: "OPEN" }
    });

    if (pending) {
        return {
            success: false,
            error: "PENDING_JORNADA",
            pendingJornadaId: pending.id
        };
    }

    try {
        const jornada = await prisma.jornada.create({
            data: {
                openedBy: Number(session.user.id),
                openingAmount,
                status: "OPEN"
            }
        });

        revalidatePath("/admin/jornada");
        return { success: true };
    } catch (e) {
        return { success: false, error: "INTERNAL ERROR" };
    }
}

export async function closeJornada(
    jornadaId: number,
    actualClosingAmount: number
) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "PERMISSION DENIED" };
    }

    if (!Number.isFinite(actualClosingAmount) || actualClosingAmount < 0) {
        return { success: false, error: "Monto físico inválido" };
    }

    const jornada = await prisma.jornada.findUnique({
        where: { id: jornadaId }
    });

    if (!jornada) {
        return { success: false, error: "Jornada no encontrada" };
    }

    if (jornada.status !== "OPEN") {
        return { success: false, error: "La jornada ya está cerrada" };
    }

    // Open table/client accounts must be settled in the POS first (paid,
    // sent to debt or cancelled): closing over them would strand the sales
    // as UNPAID forever, with no UI left to resolve them.
    const openAccounts = await prisma.sales.groupBy({
        by: ["source_type"],
        where: { jornadaId: jornada.id, status: "UNPAID" },
        _count: { id: true },
        _sum: { total: true },
    });

    if (openAccounts.length > 0) {
        return {
            success: false,
            error: "OPEN_ACCOUNTS",
            openAccounts: openAccounts.map((a) => ({
                sourceType: a.source_type ?? "SIN ORIGEN",
                count: a._count.id,
                total: Number(a._sum.total ?? 0),
            })),
        };
    }

    // Same filter as getActiveJornadaWithStats: only PAID sales count as
    // received cash. Without it, cancelled sales (which keep their original
    // payment_method) and sales converted to debt inflated the expected
    // closing amount with money that never reached the register.
    const cashSales = await prisma.sales.aggregate({
        where: {
            jornadaId: jornada.id,
            OR: [{ payment_method: "CASH" }, { payment_method: null }],
            status: "PAID"
        },
        _sum: { total: true }
    });

    const bills = await prisma.bill.aggregate({
        where: { jornadaId: jornada.id },
        _sum: { amount: true }
    });

    const savingsDeposits = await prisma.savings_movement.aggregate({
        where: { jornadaId: jornada.id, type: "DEPOSIT" },
        _sum: { amount: true }
    });

    const savingsWithdraws = await prisma.savings_movement.aggregate({
        where: { jornadaId: jornada.id, type: "WITHDRAW" },
        _sum: { amount: true }
    });


    const opening = Number(jornada.openingAmount);
    const salesSum = Number(cashSales._sum.total ?? 0);
    const billsSum = Number(bills._sum.amount ?? 0);
    const depositsSum = Number(savingsDeposits._sum.amount ?? 0);
    const withdrawsSum = Number(savingsWithdraws._sum.amount ?? 0);


    const expectedClosingAmount = opening + salesSum - billsSum - depositsSum + withdrawsSum;

    try {
        const res = await prisma.jornada.update({
            where: { id: jornadaId },
            data: {
                status: "CLOSED",
                closedAt: new Date(),
                closedBy: Number(session.user.id),
                expectedClosingAmount,
                actualClosingAmount
            }
        });

        revalidatePath("/admin/jornada");
        return { success: true };
    } catch (e) {
        return { success: false, error: "INTERNAL ERROR" };
    }
}

export async function getActiveJornadaWithStats() {
    const session = await auth();
    if (!session?.user) return null;

    const jornada = await prisma.jornada.findFirst({
        where: { status: "OPEN" },
        include: {
            openedByUser: { select: { id: true, name: true } }
        }
    });

    if (!jornada) {
        return {
            state: "NO_JORNADA" as const,
            currentUserId: Number(session.user.id)
        };
    }

    const [cashSales, transferSales, bills] = await Promise.all([
        prisma.sales.aggregate({
            where: {
                jornadaId: jornada.id,
                OR: [{ payment_method: "CASH" }, { payment_method: null }],
                status: "PAID"
            },
            _sum: { total: true }
        }),
        prisma.sales.aggregate({
            where: { jornadaId: jornada.id, payment_method: "TRANSFER", status: "PAID" },
            _sum: { total: true }
        }),
        prisma.bill.aggregate({
            where: { jornadaId: jornada.id },
            _sum: { amount: true }
        })
    ]);

    const savingsDeposits = await prisma.savings_movement.aggregate({
        where: { jornadaId: jornada.id, type: "DEPOSIT" },
        _sum: { amount: true }
    });

    const savingsWithdraws = await prisma.savings_movement.aggregate({
        where: { jornadaId: jornada.id, type: "WITHDRAW" },
        _sum: { amount: true }
    });

    const opening = Number(jornada.openingAmount);
    const cashSum = Number(cashSales._sum.total ?? 0);
    const transferSum = Number(transferSales._sum.total ?? 0);
    const billsSum = Number(bills._sum.amount ?? 0);
    const depositsSum = Number(savingsDeposits._sum.amount ?? 0);
    const withdrawsSum = Number(savingsWithdraws._sum.amount ?? 0);
    // Savings live outside the register: a deposit takes cash out of the
    // drawer and a withdraw puts it back in. Same formula as closeJornada.
    const expectedCash = opening + cashSum - billsSum - depositsSum + withdrawsSum;

    const currentUserId = Number(session.user.id);
    const isMine = jornada.openedBy === currentUserId;

    const serializedJornada = {
        id: jornada.id,
        openedAt: jornada.openedAt,
        closedAt: jornada.closedAt,
        openedBy: jornada.openedBy,
        closedBy: jornada.closedBy,
        status: jornada.status,
        openingAmount: Number(jornada.openingAmount),
        expectedClosingAmount: jornada.expectedClosingAmount !== null
            ? Number(jornada.expectedClosingAmount)
            : null,
        actualClosingAmount: jornada.actualClosingAmount !== null
            ? Number(jornada.actualClosingAmount)
            : null,
        openedByUser: jornada.openedByUser
            ? { id: jornada.openedByUser.id, name: jornada.openedByUser.name }
            : null,
    };

    return {
        state: isMine ? "OWN_OPEN" as const : "OTHER_OPEN" as const,
        jornada: serializedJornada,
        stats: { cashSales: cashSum, transferSales: transferSum, bills: billsSum, expectedCash },
        currentUserId
    };
}


export async function getJornadaEmployeeBreakdown(jornadaId: number) {
    const session = await auth();
    if (!session?.user) return [];

    const grouped = await prisma.sales.groupBy({
        by: ['placedBy'],
        where: { jornadaId, status: 'PAID' },
        _sum: { total: true },
        _count: { id: true },
    });

    if (grouped.length === 0) return [];

    const userIds = grouped.map(g => g.placedBy).filter((id): id is number => id !== null);
    const users = await prisma.users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
    });

    const usersMap = new Map(users.map(u => [u.id, u.name ?? 'Sin nombre']));

    return grouped
        .map(g => ({
            userId: g.placedBy,
            userName: g.placedBy ? usersMap.get(g.placedBy) ?? 'Desconocido' : 'Desconocido',
            salesCount: g._count.id,
            totalSold: Number(g._sum.total ?? 0),
        }))
        .sort((a, b) => b.totalSold - a.totalSold);
}