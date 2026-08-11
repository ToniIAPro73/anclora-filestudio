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
