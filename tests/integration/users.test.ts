import { describe, it, expect, beforeAll, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { loginAs, logout, resetDb, seedBase } from "./helpers";
import { GetAllUsers, saveUser } from "@/lib/actions/users";

describe("users actions", () => {
    beforeAll(async () => {
        await resetDb();
        await seedBase();
    });

    it("rejects saveUser without an ADMIN session", async () => {
        logout();
        expect(await saveUser({ name: "Carlos Ramirez Diaz", role: "ADMIN", password: "secret123" }))
            .toMatchObject({ success: false, error: "UNAUTHORIZED" });

        loginAs("STAFF");
        expect(await saveUser({ name: "Carlos Ramirez Diaz", role: "ADMIN", password: "secret123" }))
            .toMatchObject({ success: false, error: "UNAUTHORIZED" });

        expect(await prisma.users.count()).toBe(1); // only the seeded admin
    });

    it("creates an ADMIN user with a hashed password and generated username", async () => {
        loginAs("ADMIN");
        const res = await saveUser({
            name: "Carlos Ramirez Diaz",
            role: "ADMIN",
            password: "secret123",
            email: "carlos@test.local",
            active: true,
        });
        expect(res).toMatchObject({ success: true });

        const row = await prisma.users.findFirstOrThrow({ where: { email: "carlos@test.local" } });
        expect(row.role).toBe("ADMIN");
        expect(row.username).toBeTruthy();
        expect(row.password).not.toBe("secret123");
        expect(await bcrypt.compare("secret123", row.password!)).toBe(true);
        expect(row.pin).toBeNull();
    });

    it("creates a STAFF user with a hashed pin", async () => {
        loginAs("ADMIN");
        const res = await saveUser({
            name: "Maria Lopez Garcia",
            role: "STAFF",
            pin: "4321",
            password: "",
            active: true,
        });
        expect(res).toMatchObject({ success: true });

        const row = await prisma.users.findFirstOrThrow({ where: { name: "Maria Lopez Garcia" } });
        expect(row.role).toBe("STAFF");
        expect(row.pin).not.toBe("4321");
        expect(await bcrypt.compare("4321", row.pin!)).toBe(true);
        expect(row.password).toBeNull();
    });

    it("updates an existing user's name without touching credentials", async () => {
        loginAs("ADMIN");
        const before = await prisma.users.findFirstOrThrow({ where: { email: "carlos@test.local" } });

        const res = await saveUser({ id: before.id, name: "Carlos Editado Diaz", role: "ADMIN", password: "" });
        expect(res).toMatchObject({ success: true });

        const after = await prisma.users.findUniqueOrThrow({ where: { id: before.id } });
        expect(after.name).toBe("Carlos Editado Diaz");
        expect(after.password).toBe(before.password);
    });

    it("re-hashes the credential when a new one is provided on update", async () => {
        loginAs("ADMIN");
        const before = await prisma.users.findFirstOrThrow({ where: { email: "carlos@test.local" } });

        const res = await saveUser({ id: before.id, name: before.name!, role: "ADMIN", password: "otropass9" });
        expect(res).toMatchObject({ success: true });

        const after = await prisma.users.findUniqueOrThrow({ where: { id: before.id } });
        expect(after.password).not.toBe(before.password);
        expect(await bcrypt.compare("otropass9", after.password!)).toBe(true);
    });

    it("GetAllUsers returns rows with a session and nothing without one", async () => {
        loginAs("ADMIN");
        const rows = await GetAllUsers();
        expect(rows.length).toBe(3);

        logout();
        expect(await GetAllUsers()).toEqual([]);
    });
});
