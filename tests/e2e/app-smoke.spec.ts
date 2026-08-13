import { expect, test } from "@playwright/test";

test("FileStudio shell renders", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Anclora FileStudio/i);
  await expect(page.getByRole("heading", { name: /FileStudio/i }).first()).toBeVisible();

  const logo = page.locator('img[alt="Anclora FileStudio"][src*="/brand/anclora-filestudio.png"]').first();
  await expect(logo).toBeVisible();
  await expect
    .poll(async () => logo.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => logo.evaluate((img) => (img as HTMLImageElement).naturalHeight))
    .toBeGreaterThan(0);
});

test.describe("navigation routes", () => {
  for (const route of ["/", "/convert", "/tools", "/history", "/diagnostics"]) {
    test(`opens ${route} directly and refreshes without 404`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/404|This page could not be found/i)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: /FileStudio|Convertir|Herramientas|Historial|Diagnóstico/i }).first()).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText(/404|This page could not be found/i)).toHaveCount(0);
    });
  }
});

test("home cards and nav buttons perform real navigation", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.getByRole("tab", { name: /Herramientas/i }).first().click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.getByRole("heading", { name: /Herramientas/i }).first()).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Documentos/i }).first().click();
  await expect(page).toHaveURL(/\/convert$/);
  await expect(page.getByRole("heading", { name: /Convertir/i }).first()).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Imágenes .*operaciones/i }).first().click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.getByRole("heading", { name: /Herramientas|Imágenes/i }).first()).toBeVisible();
});
