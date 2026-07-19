import { test, expect } from "@playwright/test";

// The page renders a desktop and a mobile variant; scope to the desktop one.
const desktopRoot = "div.hidden.md\\:flex";

test.describe("inventory", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/admin/inventory");
    });

    test("creates a supply and shows it in the table", async ({ page }) => {
        const root = page.locator(desktopRoot);

        await root.getByPlaceholder("Nombre del insumo...").fill("Insumo E2E");
        await root.getByPlaceholder("0", { exact: true }).fill("25");
        await root.locator('button:has-text("...")').click();
        await page.getByText("KILOG", { exact: true }).click();
        await root.getByPlaceholder("0.00").fill("15");
        await root.getByRole("button", { name: "AGREGAR" }).click();

        await expect(root.getByText("Insumo guardado exitosamente.")).toBeVisible();

        await root.getByPlaceholder("Buscar insumo...").fill("Insumo E2E");
        await expect(root.getByRole("cell", { name: "Insumo E2E" })).toBeVisible();
    });

    test("edits a supply from the row form", async ({ page }) => {
        const root = page.locator(desktopRoot);

        await root.getByPlaceholder("Buscar insumo...").fill("Insumo E2E");
        await root.getByRole("cell", { name: "Insumo E2E" }).click();

        const form = root.locator("form:not([hidden])");
        await expect(form.getByText("Editar Insumo")).toBeVisible();

        await form.locator('input[name="name"]').fill("Insumo E2E Editado");
        await form.getByRole("button", { name: "Actualizar" }).click();

        await expect(root.getByText("Insumo guardado exitosamente.")).toBeVisible();
        await root.getByPlaceholder("Buscar insumo...").fill("Insumo E2E Editado");
        await expect(root.getByRole("cell", { name: "Insumo E2E Editado" })).toBeVisible();
    });

    test("deletes a supply and removes it from the table", async ({ page }) => {
        const root = page.locator(desktopRoot);

        await root.getByPlaceholder("Buscar insumo...").fill("Insumo E2E Editado");
        await root.getByRole("cell", { name: "Insumo E2E Editado" }).click();

        const form = root.locator("form:not([hidden])");
        // The delete trigger is the only icon-only button in the form.
        await form.getByRole("button").filter({ hasNotText: /\w/ }).click();
        await page.getByRole("button", { name: "Sí, eliminar" }).click();

        await expect(root.getByText("Insumo Eliminado")).toBeVisible();
        await expect(root.getByRole("cell", { name: "Insumo E2E Editado" })).toBeHidden();
    });
});
