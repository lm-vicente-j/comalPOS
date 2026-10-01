import { test, expect, type Request } from "@playwright/test";

const movements = [
    { type: "SUELDO", button: "Registrar Pago de Sueldo", label: "Pago de sueldo", amount: "750", width: 1280, height: 720 },
    { type: "BONO", button: "Otorgar Bono", label: "Bono", amount: "125.5", width: 360, height: 640 },
    { type: "ADELANTO", button: "Adelantar Sueldo", label: "Adelanto de sueldo", amount: "75.25", width: 320, height: 480 },
];

test.describe("payroll roster", () => {
    for (const movement of movements) {
        test(`requires both confirmations before registering ${movement.type.toLowerCase()}`, async ({ page }) => {
            test.setTimeout(120_000);
            await page.setViewportSize({ width: movement.width, height: movement.height });
            await page.goto("/admin/roster");

            await page.getByText("Seleccionar Empleado").click();
            await page.getByRole("option", { name: /Staff E2E/ }).click();

            const description = `semana e2e ${movement.type}`;
            const paymentRequests: Request[] = [];
            const isPaymentRequest = (request: Request) => request.method() === "POST"
                && new URL(request.url()).pathname === "/admin/roster"
                && (request.postData()?.includes(`${movement.type}: ${description}`) ?? false);
            page.on("request", request => {
                if (isPaymentRequest(request)) paymentRequests.push(request);
            });

            const amount = page.getByPlaceholder("$0.00");
            const reason = page.getByPlaceholder("Ej: Bono por puntualidad");
            await amount.fill(movement.amount);
            await reason.fill(description);
            await amount.press("Enter");
            await expect(page.getByRole("dialog")).toHaveCount(0);
            expect(paymentRequests).toHaveLength(0);

            const start = page.getByRole("button", { name: movement.button, exact: true });
            const summary = page.getByRole("dialog", { name: "Resumen del movimiento", exact: true });
            const confirmation = page.getByRole("alertdialog", { name: "Confirmar operación no reversible" });
            const formattedAmount = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(movement.amount));

            await start.click();
            await expect(summary).toBeVisible();
            await expect(summary.getByText("Staff E2E", { exact: true })).toBeVisible();
            await expect(summary.getByText(movement.label, { exact: true })).toBeVisible();
            await expect(summary.getByText(formattedAmount, { exact: true })).toBeVisible();
            await expect(summary.getByText(description, { exact: true })).toBeVisible();
            await expect(summary).toBeInViewport({ ratio: 1 });
            await expect(summary.getByRole("button", { name: "Cancelar", exact: true })).toBeInViewport({ ratio: 1 });
            await expect(summary.getByRole("button", { name: "Continuar", exact: true })).toBeInViewport({ ratio: 1 });
            expect(paymentRequests).toHaveLength(0);
            await test.info().attach("salary-summary", { body: await page.screenshot(), contentType: "image/png" });

            await summary.getByRole("button", { name: "Cancelar", exact: true }).click();
            await expect(summary).toHaveCount(0);
            await expect(amount).toHaveValue(movement.amount);
            await expect(reason).toHaveValue(description);
            expect(paymentRequests).toHaveLength(0);

            await start.click();
            await summary.getByRole("button", { name: "Continuar", exact: true }).click();
            await expect(summary).toHaveCount(0);
            await expect(confirmation).toBeVisible();
            await expect(confirmation.getByText(/Esta operación no se puede revertir/)).toBeVisible();
            await expect(confirmation).toBeInViewport({ ratio: 1 });
            await expect(confirmation.getByRole("button", { name: "Cancelar", exact: true })).toBeInViewport({ ratio: 1 });
            await expect(confirmation.getByRole("button", { name: "Confirmar registro", exact: true })).toBeInViewport({ ratio: 1 });
            expect(paymentRequests).toHaveLength(0);
            await test.info().attach("salary-final-confirmation", { body: await page.screenshot(), contentType: "image/png" });

            await confirmation.getByRole("button", { name: "Cancelar", exact: true }).click();
            await expect(confirmation).toHaveCount(0);
            await expect(amount).toHaveValue(movement.amount);
            await expect(reason).toHaveValue(description);
            expect(paymentRequests).toHaveLength(0);

            await start.click();
            await summary.getByRole("button", { name: "Continuar", exact: true }).click();
            const paymentRequest = page.waitForRequest(isPaymentRequest);
            await confirmation.getByRole("button", { name: "Confirmar registro", exact: true }).click();
            await paymentRequest;
            await expect(confirmation).toHaveCount(0);
            await expect(page.getByText("Pago registrado exitosamente.")).toBeVisible();
            await expect(page.getByRole("cell", { name: `${movement.type}: ${description}`, exact: true })).toBeVisible();
            await expect(page.getByRole("cell", { name: "$" + movement.amount, exact: true })).toBeVisible();
            expect(paymentRequests).toHaveLength(1);
            await expect(amount).toHaveValue("");
            await expect(reason).toHaveValue("");
        });
    }
});
