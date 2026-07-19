import { vi } from "vitest";
import type { Session } from "next-auth";

/**
 * Shared helpers for the server-action integration tests.
 *
 * Every test file mocks `@/lib/auth` with `mockAuth` (so actions see a real
 * looking JWT session without NextAuth needing a request context) and
 * `next/cache` (revalidatePath only works inside a Next.js request).
 */

export const authMock = vi.fn<() => Promise<Session | null>>();

export function loginAs(role: "ADMIN" | "STAFF", id = 1) {
    authMock.mockResolvedValue({
        user: { id: String(id), name: "Test User", role },
        expires: new Date(Date.now() + 3600_000).toISOString(),
    } as Session);
}

export function logout() {
    authMock.mockResolvedValue(null);
}

/** Deletes every row in dependency order so each suite starts clean. */
export async function resetDb() {
    const { default: prisma } = await import("@/lib/prisma");
    await prisma.$transaction([
        prisma.goal_contribution.deleteMany(),
        prisma.savings_goal.deleteMany(),
        prisma.savings_movement.deleteMany(),
        prisma.debtors.deleteMany(),
        prisma.sale_items.deleteMany(),
        prisma.sales.deleteMany(),
        prisma.recipes.deleteMany(),
        prisma.products.deleteMany(),
        prisma.supplies.deleteMany(),
        prisma.salary.deleteMany(),
        prisma.bill.deleteMany(),
        prisma.jornada.deleteMany(),
        prisma.customer.deleteMany(),
        prisma.users.deleteMany(),
    ]);
}

/** Base fixtures most suites need: an admin user and an open jornada. */
export async function seedBase() {
    const { default: prisma } = await import("@/lib/prisma");
    const admin = await prisma.users.create({
        data: { name: "Admin Test", email: "admin@test.local", role: "ADMIN", active: true },
    });
    const jornada = await prisma.jornada.create({
        data: { openedBy: admin.id, openingAmount: 500, status: "OPEN" },
    });
    return { admin, jornada };
}
