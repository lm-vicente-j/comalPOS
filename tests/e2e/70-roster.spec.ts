import { test, expect } from "@playwright/test";

test.describe("payroll roster", () => {
    test("registers a salary payment and shows it in the history", async ({ page }) => {
        await page.goto("/admin/roster");

        await page.getByText("Seleccionar Empleado").click();
        await page.getByRole("option", { name: /Staff E2E/ }).click();

        await page.getByPlaceholder("$0.00").fill("750");
        await page.getByPlaceholder("Ej: Bono por puntualidad").fill("semana e2e");
        await page.getByRole("button", { name: "Registrar Pago de Sueldo" }).click();

        await expect(page.getByText("Pago registrado exitosamente.")).toBeVisible();
        await expect(page.getByRole("cell", { name: "SUELDO: semana e2e" })).toBeVisible();
        await expect(page.getByRole("cell", { name: "$750" })).toBeVisible();
    });
});
