import { test, expect } from "@playwright/test";

test.describe("crm", () => {
    test("registers a new customer", async ({ page }) => {
        await page.goto("/admin/crm");

        await page.getByPlaceholder("Nombre Completo").fill("Cliente Playwright");
        await page.getByPlaceholder("XXXX-XXXX-XX").fill("555-111-22");
        await page.getByRole("button", { name: "Registrar Nuevo Cliente" }).click();

        await page.waitForTimeout(1000);
        await page.reload();
        // Desktop and mobile managers coexist in the DOM; use the visible one.
        await page.getByPlaceholder("Buscar cliente...").filter({ visible: true }).fill("Cliente Playwright");
        await expect(page.getByText("Cliente Playwright").first()).toBeVisible();
    });

    test("registers a new admin employee", async ({ page }) => {
        await page.goto("/admin/crm");
        await page.getByRole("tab", { name: "Empleados" }).click();

        // Both the edit and the create employee forms are in the DOM; use
        // the visible (non-hidden) one.
        const form = page.locator("form:not([hidden])").filter({ hasText: "Registrar Nuevo Empleado" });
        await form.getByPlaceholder("Nombre Completo").fill("Empleado Playwright Prueba");
        await form.getByText("Seleccionar Rol").click();
        await page.getByRole("option", { name: "Administrador" }).click();
        await form.getByPlaceholder("Contraseña...").fill("e2epass1");
        await form.getByRole("button", { name: "Registrar Nuevo Empleado" }).click();

        await page.waitForTimeout(1000);
        await page.reload();
        await page.getByRole("tab", { name: "Empleados" }).click();
        await page.getByPlaceholder("Buscar empleado...").filter({ visible: true }).fill("Empleado Playwright");
        await expect(page.getByText("Empleado Playwright Prueba").first()).toBeVisible();
    });
});
