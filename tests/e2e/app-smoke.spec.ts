import { expect, test } from "@playwright/test";

test("FileStudio shell renders", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Anclora FileStudio/i);
  await expect(page.getByRole("heading", { name: /FileStudio/i }).first()).toBeVisible();
});
