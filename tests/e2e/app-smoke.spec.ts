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

test.describe("workspace navigation remains usable while the UX API is pending", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/capabilities?ux=v3", () => new Promise(() => {}));
  });

  test("Home to Convertir shows the conversion workspace without waiting for API hydration", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: /^Convertir$/i }).click();

    await expect(page).toHaveURL(/\/convert$/);
    await expect(page.getByRole("heading", { name: /^Convertir$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Convertir a PDF/i })).toBeVisible();
  });

  test("Home to Herramientas shows the tools workspace without waiting for API hydration", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: /^Herramientas$/i }).click();

    await expect(page).toHaveURL(/\/tools$/);
    await expect(page.getByRole("heading", { name: /^Herramientas$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^PDF/i })).toBeVisible();
  });

  test("direct workspaces render and refresh without the UX API", async ({ page }) => {
    await page.goto("/convert", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Convertir$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Convertir a PDF/i })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Convertir$/i })).toBeVisible();

    await page.goto("/tools", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Herramientas$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^PDF/i })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Herramientas$/i })).toBeVisible();
  });

  test("back and forward preserve workspace rendering", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: /^Convertir$/i }).click();
    await expect(page).toHaveURL(/\/convert$/);
    await expect(page.getByRole("heading", { name: /^Convertir$/i })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/convert$/);
    await expect(page.getByRole("heading", { name: /^Convertir$/i })).toBeVisible();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: /^Herramientas$/i }).click();
    await expect(page).toHaveURL(/\/tools$/);
    await expect(page.getByRole("heading", { name: /^Herramientas$/i })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/tools$/);
    await expect(page.getByRole("heading", { name: /^Herramientas$/i })).toBeVisible();
  });

  test("category URLs render the requested workspaces without the UX API", async ({ page }) => {
    await page.goto("/convert?category=images", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("tab", { name: /^Imágenes/i })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: /^Convertir a PNG/i })).toBeVisible();

    await page.goto("/tools?category=pdf", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Organizar PDF/i })).toBeVisible();
  });
});

test.describe("home quick source-target selector", () => {
  test("DOCX target picker shows categorized canonical targets and continues with PDF", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await selectHomeSource(page, "docx");
    await expect(page.getByTestId("suggestion-row-target")).toBeVisible();

    const chips = await targetChipValues(page);
    const expected = ["html", "md", "odt", "pdf", "png", "rtf", "tiff", "txt"].sort();
    expect(chips.sort()).toEqual(expected);

    await page.getByTestId("home-target-select").click();
    await expect(activeCategory(page, "home-target-select")).toHaveAttribute("data-category", "documents");
    await expect(categoryIds(page, "home-target-select")).resolves.toEqual(["documents", "images"]);
    await expect(visiblePickerFormats(page, "home-target-select")).resolves.toEqual(["html", "md", "odt", "pdf", "rtf", "txt"].sort());
    for (const invalid of ["png", "tiff", "tex", "rst", "jpg", "azw3", "epub", "mobi"]) {
      await expect(page.getByTestId("home-target-select-panel").locator(`[data-testid="home-target-select-option"][data-format="${invalid}"]`)).toHaveCount(0);
    }

    await page.locator('[data-testid="home-target-select-category"][data-category="images"]').click();
    await expect(activeCategory(page, "home-target-select")).toHaveAttribute("data-category", "images");
    await expect(visiblePickerFormats(page, "home-target-select")).resolves.toEqual(["png", "tiff"]);

    await page.locator('[data-testid="home-target-select-category"][data-category="documents"]').click();
    await page.locator('[data-testid="home-target-select-option"][data-format="pdf"]').click();
    await expect(page.getByTestId("home-target-select")).toContainText("PDF");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\/convert\?source=docx&target=pdf$/);
    await expect(page.getByRole("heading", { name: /^Convertir a PDF$/i })).toBeVisible();
    await expect(page.getByText(/Elegir archivo DOCX/i)).toBeVisible();
  });

  test("real UI chips, picker and served canonical model match for first 50 source formats", async ({ page }) => {
    test.setTimeout(180_000);
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
      const pickerValues = await targetPickerUnion(page);
      expect(pickerValues, `${source.id} picker`).toEqual(expected);
      expect(new Set(pickerValues).size, `${source.id} duplicates`).toBe(pickerValues.length);
    }
  });

  test("target picker search is global and restores category mode", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await selectHomeSource(page, "docx");
    await page.getByTestId("home-target-select").click();
    await expect(activeCategory(page, "home-target-select")).toHaveAttribute("data-category", "documents");
    await page.getByPlaceholder("Buscar formato, extensión o alias...").fill("png");
    await expect(visiblePickerFormats(page, "home-target-select")).resolves.toEqual(["png"]);
    await page.getByPlaceholder("Buscar formato, extensión o alias...").fill("");
    await expect(activeCategory(page, "home-target-select")).toHaveAttribute("data-category", "documents");
    await expect(visiblePickerFormats(page, "home-target-select")).resolves.toEqual(["html", "md", "odt", "pdf", "rtf", "txt"].sort());
  });

  test("DOCX to Markdown continues into a canonical source-target deep link", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await selectHomeSource(page, "docx");
    await selectHomeTarget(page, "md");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/\/convert\?source=docx&target=md$/);
    await expect(page.getByRole("heading", { name: /^Convertir a MD$/i })).toBeVisible();
    await expect(page.getByText(/Origen: DOCX/i)).toBeVisible();
    await expect(page.getByText(/Elegir archivo DOCX/i)).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/convert\?source=docx&target=md$/);
    await expect(page.getByRole("heading", { name: /^Convertir a MD$/i })).toBeVisible();
    await expect(page.getByText(/Elegir archivo DOCX/i)).toBeVisible();
  });

  test("source-target conversion URLs hydrate and validate canonical pairs", async ({ page }) => {
    await page.goto("/convert?source=docx&target=md", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Convertir a MD$/i })).toBeVisible();
    await expect(page.getByText(/Elegir archivo DOCX/i)).toBeVisible();

    await page.goto("/convert?source=docx&target=mp3", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Origen: DOCX/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Convertir a MD$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Convertir a PDF/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Convertir a MP3/i })).toHaveCount(0);

    await page.goto("/convert?source=notreal&target=md", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Origen:/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Convertir a MD$/i })).toBeVisible();
  });

  test("source-target deep links survive back and forward", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await selectHomeSource(page, "docx");
    await selectHomeTarget(page, "md");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\/convert\?source=docx&target=md$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/convert\?source=docx&target=md$/);
    await expect(page.getByRole("heading", { name: /^Convertir a MD$/i })).toBeVisible();
    await expect(page.getByText(/Elegir archivo DOCX/i)).toBeVisible();
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
  await page.getByTestId("home-source-select").click();
  await page.getByPlaceholder("Buscar formato, extensión o alias...").fill(value);
  await page.locator(`[data-testid="home-source-select-option"][data-format="${value}"]`).click();
}

async function selectHomeTarget(page: import("@playwright/test").Page, value: string): Promise<void> {
  await page.getByTestId("home-target-select").click();
  await page.getByPlaceholder("Buscar formato, extensión o alias...").fill(value);
  await page.locator(`[data-testid="home-target-select-option"][data-format="${value}"]`).click();
}

async function categoryIds(page: import("@playwright/test").Page, testId: string): Promise<string[]> {
  return page.getByTestId(`${testId}-category`).evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("data-category")).filter((value): value is string => Boolean(value))
  );
}

function activeCategory(page: import("@playwright/test").Page, testId: string) {
  return page.locator(`[data-testid="${testId}-category"][aria-selected="true"]`);
}

async function visiblePickerFormats(page: import("@playwright/test").Page, testId: string): Promise<string[]> {
  return page.getByTestId(`${testId}-panel`).locator(`[data-testid="${testId}-option"]`).evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("data-format")).filter((value): value is string => Boolean(value)).sort()
  );
}

async function targetPickerUnion(page: import("@playwright/test").Page): Promise<string[]> {
  await page.getByTestId("home-target-select").click();
  const values = new Set<string>();
  for (const categoryId of await categoryIds(page, "home-target-select")) {
    await page.locator(`[data-testid="home-target-select-category"][data-category="${categoryId}"]`).click();
    for (const formatId of await visiblePickerFormats(page, "home-target-select")) values.add(formatId);
  }
  await page.keyboard.press("Escape");
  return Array.from(values).sort();
}
