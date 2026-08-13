import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

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
  await expect(page.getByRole("button", { name: /Documentos.*destinos/i })).toBeVisible();
  await page.getByRole("button", { name: /Documentos.*destinos/i }).click();
  await expect(page).toHaveURL(/\/convert\?category=documents$/);
  await expect(page.getByRole("heading", { name: /Convertir/i }).first()).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /^Imágenes.*operaciones/i })).toBeVisible();
  await page.getByRole("button", { name: /^Imágenes.*operaciones/i }).click();
  await expect(page).toHaveURL(/\/tools\?category=images$/);
  await expect(page.getByRole("heading", { name: /Herramientas|Imágenes/i }).first()).toBeVisible();
});

test.describe("home quick source-target selector", () => {
  test("DOCX chips and real target dropdown expose exactly the same canonical targets", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await selectHomeSource(page, "docx");
    await expect(page.getByTestId("suggestion-row-target")).toBeVisible();

    const chips = await targetChipValues(page);
    const dropdown = await targetDropdownValues(page);
    const expected = ["html", "md", "odt", "pdf", "png", "rtf", "tiff", "txt"].sort();

    expect(chips.sort()).toEqual(expected);
    expect(dropdown.sort()).toEqual(expected);
    for (const invalid of ["tex", "rst", "jpg", "azw3", "epub", "mobi"]) {
      expect(dropdown).not.toContain(invalid);
    }
  });

  test("real UI chips, dropdown and served canonical model match for first 50 source formats", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const model = await page.evaluate(async () => {
      const response = await fetch("/api/capabilities?ux=v3");
      if (!response.ok) throw new Error(`ux model ${response.status}`);
      return response.json() as Promise<{ formats: Array<{ id: string; targetsCount: number }>; routes: Array<{ source: string; target: string }> }>;
    });

    const sources = model.formats.filter((format) => format.targetsCount > 0).slice(0, 50);
    for (const source of sources) {
      await selectHomeSource(page, source.id);
      await expect(page.getByTestId("suggestion-row-target")).toBeVisible();

      const expected = model.routes
        .filter((route) => route.source === source.id)
        .slice(0, 8)
        .map((route) => route.target)
        .sort();

      expect(await targetChipValues(page), `${source.id} chips`).toEqual(expected);
      expect(await targetDropdownValues(page), `${source.id} dropdown`).toEqual(expected);
    }
  });
});

test.describe("home card category context", () => {
  test("conversion cards preserve category through URL, refresh and history", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Documentos.*destinos/i })).toBeVisible();
    await page.getByRole("button", { name: /Documentos.*destinos/i }).click();
    await expect(page).toHaveURL(/\/convert\?category=documents$/);
    await expect(page.getByRole("tab", { name: /^Documentos/i })).toHaveAttribute("aria-selected", "true");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Imágenes.*destinos/i })).toBeVisible();
    await page.getByRole("button", { name: /Imágenes.*destinos/i }).click();
    await expect(page).toHaveURL(/\/convert\?category=images$/);
    await expect(page.getByRole("tab", { name: /^Imágenes/i })).toHaveAttribute("aria-selected", "true");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("tab", { name: /^Imágenes/i })).toHaveAttribute("aria-selected", "true");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/convert\?category=images$/);
    await expect(page.getByRole("tab", { name: /^Imágenes/i })).toHaveAttribute("aria-selected", "true");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /^Audio.*destinos/i })).toBeVisible();
    await page.getByRole("button", { name: /^Audio.*destinos/i }).click();
    await expect(page).toHaveURL(/\/convert\?category=audio$/);
    await expect(page.getByRole("tab", { name: /^Audio/i })).toHaveAttribute("aria-selected", "true");
  });

  test("tool cards preserve category through URL and direct refresh", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /^PDF.*operaciones/i })).toBeVisible();
    await page.getByRole("button", { name: /^PDF.*operaciones/i }).click();
    await expect(page).toHaveURL(/\/tools\?category=pdf$/);
    await expect(page.getByRole("heading", { name: /Organizar PDF/i })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Organizar PDF/i })).toBeVisible();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /^Imágenes.*operaciones/i })).toBeVisible();
    await page.getByRole("button", { name: /^Imágenes.*operaciones/i }).click();
    await expect(page).toHaveURL(/\/tools\?category=images$/);
    await expect(page.getByRole("heading", { name: /Preparar imágenes/i })).toBeVisible();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /^Conversión con OCR.*operaciones/i })).toBeVisible();
    await page.getByRole("button", { name: /^Conversión con OCR.*operaciones/i }).click();
    await expect(page).toHaveURL(/\/tools\?category=ocr$/);
    await expect(page.getByRole("heading", { name: /Conversión con OCR/i })).toBeVisible();
  });

  test("unknown category query falls back without 404", async ({ page }) => {
    await page.goto("/convert?category=foo", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/404|This page could not be found/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Convertir$/i })).toBeVisible();

    await page.goto("/tools?category=foo", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/404|This page could not be found/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Herramientas$/i })).toBeVisible();
  });
});

async function targetChipValues(page: import("@playwright/test").Page): Promise<string[]> {
  return page.getByTestId("suggestion-row-target").locator("button[data-format]").evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("data-format")).filter((value): value is string => Boolean(value)).sort()
  );
}

async function selectHomeSource(page: import("@playwright/test").Page, value: string): Promise<void> {
  await expect
    .poll(async () => page.getByTestId("home-source-select").evaluate((select, optionValue) =>
      Array.from((select as HTMLSelectElement).options).some((option) => option.value === optionValue),
    value))
    .toBe(true);
  await page.getByTestId("home-source-select").selectOption(value);
}

async function targetDropdownValues(page: import("@playwright/test").Page): Promise<string[]> {
  return page.getByTestId("home-target-select").evaluate((select) =>
    Array.from((select as HTMLSelectElement).options)
      .map((option) => option.value)
      .filter(Boolean)
      .sort()
  );
}
