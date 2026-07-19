"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { auth } from "../auth";

type ActionResult =
    | { success: true }
    | { success: false; message: string };


export async function getPoolBalance() {
    const session = await auth();
    if (!session?.user) return { balance: 0, deposited: 0, withdrawn: 0 };

    const [deposits, withdraws] = await Promise.all([
        prisma.savings_movement.aggregate({
            where: { type: "DEPOSIT" },
            _sum: { amount: true }
        }),
        prisma.savings_movement.aggregate({
            where: { type: "WITHDRAW" },
            _sum: { amount: true }
        })
    ]);

    const deposited = Number(deposits._sum.amount ?? 0);
    const withdrawn = Number(withdraws._sum.amount ?? 0);
    return { balance: deposited - withdrawn, deposited, withdrawn };
}

export async function getRecentMovements(limit = 20) {
    const session = await auth();
    if (!session?.user) return [];

    const movements = await prisma.savings_movement.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { users: { select: { name: true } } }
    });

    return movements.map(m => ({
        id: m.id,
        amount: Number(m.amount),
        type: m.type,
        description: m.description,
        createdAt: m.createdAt,
        userName: m.users?.name ?? "Sin nombre"
    }));
}

export async function saveMovement(
    amount: number,
    type: "DEPOSIT" | "WITHDRAW",
    description?: string
): Promise<ActionResult> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "PERMISSION DENIED" };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, message: "Monto inválido" };
    }

    const jornadaActiva = await prisma.jornada.findFirst({
        where: { status: "OPEN" }
    });
    if (!jornadaActiva) {
        return { success: false, message: "NO_OPEN_JORNADA" };
    }

    if (type === "WITHDRAW") {
        const { balance } = await getPoolBalance();
        if (amount > balance) {
            return { success: false, message: "Saldo insuficiente en el pool" };
        }
    }

    try {
        await prisma.savings_movement.create({
            data: {
                amount,
                type,
                description: description ?? null,
                registered_by: Number(session.user.id),
                jornadaId: jornadaActiva.id
            }
        });

        revalidatePath("/admin/savings");
        revalidatePath("/admin/jornadas", "layout");  // 👈 afecta el banner
        return { success: true };
    } catch (e) {
        return { success: false, message: "INTERNAL ERROR" };
    }
}


export async function getGoalsWithProgress() {
    const session = await auth();
    if (!session?.user) return [];

    const goals = await prisma.savings_goal.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
            contributions: {
                select: { amount: true }
            }
        }
    });

    return goals.map(g => {
        const current = g.contributions.reduce((sum, c) => sum + Number(c.amount), 0);
        return {
            id: g.id,
            name: g.name,
            targetAmount: Number(g.targetAmount),
            currentAmount: current,
            deadline: g.deadline,
            status: g.status,
            description: g.description,
            createdAt: g.createdAt,
            progressPercent: Math.min(100, (current / Number(g.targetAmount)) * 100)
        };
    });
}

export async function saveGoal(data: {
    id?: number;
    name: string;
    targetAmount: number;
    deadline?: Date | null;
    description?: string;
}): Promise<ActionResult> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "PERMISSION DENIED" };
    }

    if (!data.name?.trim() || !Number.isFinite(data.targetAmount) || data.targetAmount <= 0) {
        return { success: false, message: "Datos inválidos" };
    }

    try {
        await prisma.savings_goal.upsert({
            where: { id: data.id ?? -1 },
            update: {
                name: data.name,
                targetAmount: data.targetAmount,
                deadline: data.deadline ?? null,
                description: data.description ?? null
            },
            create: {
                name: data.name,
                targetAmount: data.targetAmount,
                deadline: data.deadline ?? null,
                description: data.description ?? null
            }
        });

        revalidatePath("/admin/savings");
        return { success: true };
    } catch (e) {
        return { success: false, message: "INTERNAL ERROR" };
    }
}

export async function cancelGoal(id: number): Promise<ActionResult> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "PERMISSION DENIED" };
    }

    try {
        await prisma.savings_goal.update({
            where: { id },
            data: { status: "CANCELLED" }
        });
        revalidatePath("/admin/savings");
        return { success: true };
    } catch (e) {
        return { success: false, message: "INTERNAL ERROR" };
    }
}


export async function addContribution(
    goalId: number,
    amount: number,
    note?: string
): Promise<ActionResult> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "PERMISSION DENIED" };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, message: "Monto inválido" };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.goal_contribution.create({
                data: { goalId, amount, note: note ?? null }
            });

            // Verificar si el target se alcanzó para auto-completar
            const [goal, sum] = await Promise.all([
                tx.savings_goal.findUnique({ where: { id: goalId } }),
                tx.goal_contribution.aggregate({
                    where: { goalId },
                    _sum: { amount: true }
                })
            ]);

            if (!goal) throw new Error("Meta no encontrada");

            const total = Number(sum._sum.amount ?? 0);
            const target = Number(goal.targetAmount);

            if (total >= target && goal.status === "ACTIVE") {
                await tx.savings_goal.update({
                    where: { id: goalId },
                    data: { status: "COMPLETED" }
                });
            }
        });

        revalidatePath("/admin/savings");
        return { success: true };
    } catch (e) {
        return { success: false, message: "INTERNAL ERROR" };
    }
}