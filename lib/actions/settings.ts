"use server"
import { z } from "zod";
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { auth } from "../auth";

// Keys of the business-wide settings kept on the server. Device-specific
// preferences (terminal label, etc.) are NOT here: they live in the browser's
// localStorage via lib/device-settings.ts. Kept local — a "use server" module
// can only export async functions (and types).
const SETTING_KEYS = {
    CLABE: "CLABE",
} as const;

export type BusinessSettings = {
    clabe: string;
};

const BusinessSettingsSchema = z.object({
    // A Mexican CLABE is exactly 18 digits. Empty is allowed so the account
    // can be cleared.
    clabe: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{18}$/.test(v), {
            message: "La CLABE debe tener 18 dígitos.",
        }),
});

export async function getSettings(): Promise<BusinessSettings> {
    const session = await auth();
    if (!session?.user) return { clabe: "" };

    try {
        const rows = await prisma.setting.findMany({
            where: { key: { in: Object.values(SETTING_KEYS) } },
        });
        const byKey = new Map(rows.map((r) => [r.key, r.value ?? ""]));
        return {
            clabe: byKey.get(SETTING_KEYS.CLABE) ?? "",
        };
    } catch (e) {
        console.error(e);
        return { clabe: "" };
    }
}

export async function saveSettings(data: Partial<BusinessSettings>) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "PERMISSION DENIED" };
    }

    const parsed = BusinessSettingsSchema.safeParse({ clabe: data.clabe ?? "" });
    if (!parsed.success) {
        return {
            success: false,
            error: "Datos inválidos",
            fieldErrors: z.flattenError(parsed.error).fieldErrors,
        };
    }

    try {
        // upsert keeps the table as an append-free key/value store: the same
        // call works whether the setting has been saved before or not.
        await prisma.setting.upsert({
            where: { key: SETTING_KEYS.CLABE },
            update: { value: parsed.data.clabe },
            create: { key: SETTING_KEYS.CLABE, value: parsed.data.clabe },
        });

        revalidatePath("/admin/settings");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Error al guardar la configuración." };
    }
}
