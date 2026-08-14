// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversionHub } from "../../../src/components/ux-v3/conversion-hub";
import { SourceSelector } from "../../../src/components/converter/source-selector";
import { FileStudioHome, getVisibleTargetRoutes, getVisibleSourceRoutes } from "../../../src/components/ux-v3/file-studio-home";
import { groupAllowedFormats } from "../../../src/components/ux-v3/premium-format-picker";
import { ToolHub } from "../../../src/components/ux-v3/tool-hub";
import { buildConversionUxModel } from "../../../src/lib/ux-v3/conversion-ux-model";
import { FORMAT_CATALOG, normalizeFormatId } from "../../../src/lib/domain/format-catalog";

const engines = new Set([
  "libreoffice",
  "pandoc",
  "sharp-image",
  "sharp",
  "ffmpeg-media",
  "ffmpeg",
  "ffprobe",
  "qpdf",
  "poppler",
  "tesseract",
  "pdftoppm",
  "sevenzip",
  "7z",
  "data-ts",
]);

const model = buildConversionUxModel("linux", engines);

afterEach(() => cleanup());

describe("UX V3 components", () => {
  it("NAV-001..005 renders the new primary navigation labels through home actions", () => {
    const onOpenConvert = vi.fn();
    const onOpenTools = vi.fn();
    render(<FileStudioHome model={model} onOpenConvert={onOpenConvert} onOpenTools={onOpenTools} />);

    expect(screen.getByText("¿Qué quieres convertir?")).toBeTruthy();
    expect(screen.getByText("Convertir")).toBeTruthy();
    expect(screen.getByText("Herramientas")).toBeTruthy();
    expect(screen.getByText("Explora conversiones por tipo de resultado.")).toBeTruthy();
  });

  it("NAV-006..011 does not expose retired top-level groups as tool categories", () => {
    render(<ToolHub model={model} onOpenTool={() => {}} />);

    expect(screen.queryByRole("button", { name: /^Documentos$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Audio y vídeo/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Ebooks$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Archivos$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^OCR$/i })).toBeNull();
    expect(screen.queryByText("Más herramientas")).toBeNull();
  });

  it("CONV-003 selects target before upload", () => {
    const onSelectTarget = vi.fn();
    render(<ConversionHub model={model} selectedTarget={null} onSelectTarget={onSelectTarget} />);

    fireEvent.click(screen.getByRole("button", { name: /Convertir a PDF/i }));
    expect(onSelectTarget).toHaveBeenCalledWith("pdf");
  });

  it("QUICK-001 filters destination when a source is selected", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    selectFormat("home-source-select", "docx");
    const values = getSuggestionFormats("target");

    expect(values).toContain("pdf");
    expect(values).toContain("png");
    expect(values).not.toContain("tex");
    expect(values).not.toContain("rst");
    expect(values).not.toContain("jpg");
    expect(values).not.toContain("azw3");
    expect(values).not.toContain("epub");
    expect(values).not.toContain("mobi");
    expect(values.sort()).toEqual(["html", "md", "odt", "pdf", "png", "rtf", "tiff", "txt"].sort());
  });

  it("QUICK-001c keeps the real DOCX chips and destination picker identical", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    selectFormat("home-source-select", "docx");

    const chipValues = getSuggestionFormats("target").sort();
    const pickerValues = getPickerUnion("home-target-select").sort();

    expect(pickerValues).toEqual(chipValues);
    expect(pickerValues).toEqual(["html", "md", "odt", "pdf", "png", "rtf", "tiff", "txt"].sort());
  });

  it("QUICK-001d keeps real chips and picker identical for the first 50 canonical formats", () => {
    const canonicalFormats = Array.from(new Set(FORMAT_CATALOG.map((format) => normalizeFormatId(format.outputExtension)).filter(Boolean))).slice(0, 50);

    for (const source of canonicalFormats) {
      cleanup();
      render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);
      const expectedTargets = getVisibleTargetRoutes(source!, model.routes).map((route) => route.target).sort();
      if (expectedTargets.length === 0) continue;

      selectFormat("home-source-select", source!);
      const chipValues = getSuggestionFormats("target").sort();
      const pickerValues = getPickerUnion("home-target-select").sort();

      expect(pickerValues, `${source} picker`).toEqual(expectedTargets);
      expect(chipValues, `${source} chips`).toEqual(expectedTargets);
      expect(new Set(pickerValues).size, `${source} duplicate targets`).toBe(pickerValues.length);
    }
  });

  it("QUICK-001b preserves source when continuing with a complete pair", () => {
    const onSelectTarget = vi.fn();
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={onSelectTarget} onOpenTools={() => {}} />);

    selectFormat("home-source-select", "docx");
    selectFormat("home-target-select", "png");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onSelectTarget).toHaveBeenCalledWith("png", "docx");
  });

  it("QUICK-002 lets the target be picked before any source (symmetric with source-first)", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    // Neither picker is disabled up front — either side can be picked first.
    expect(screen.getByTestId("home-source-select").hasAttribute("disabled")).toBe(false);
    expect(screen.getByTestId("home-target-select").hasAttribute("disabled")).toBe(false);
    expect(screen.queryByText("Selecciona primero un formato de origen")).toBeNull();

    selectFormat("home-target-select", "pdf");
    const values = getSuggestionFormats("source");

    expect(values).toContain("docx");
    expect(values.length).toBeGreaterThan(0);
  });

  it("QUICK-003 filters source options when a target is selected first (reverse of QUICK-001)", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    selectFormat("home-target-select", "png");
    const chipValues = getSuggestionFormats("source").sort();
    const pickerValues = getPickerUnion("home-source-select").sort();
    const expectedSources = getVisibleSourceRoutes("png", model.routes).map((route) => route.source).sort();

    expect(chipValues).toEqual(expectedSources);
    expect(pickerValues).toEqual(expectedSources);
    expect(chipValues).toContain("docx");
    expect(chipValues).toContain("jpg");
  });

  it("PICKER-001 opens source picker on the first valid category and only shows that category", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    fireEvent.click(screen.getByTestId("home-source-select"));
    expect(activeCategory("home-source-select")).toBe("documents");
    expect(visiblePickerFormats("home-source-select")).toEqual(groupAllowedFormats(model.formats.filter((format) => format.targetsCount > 0))[0].formats.map((format) => format.id).sort());
  });

  it("PICKER-002 supports source category switching, search, selection and Escape close", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    fireEvent.click(screen.getByTestId("home-source-select"));
    fireEvent.click(categoryButton("home-source-select", "images"));
    expect(activeCategory("home-source-select")).toBe("images");
    expect(visiblePickerFormats("home-source-select").every((id) => model.formats.find((format) => format.id === id)?.category === "images")).toBe(true);

    fireEvent.change(searchInput(), { target: { value: "docx" } });
    expect(visiblePickerFormats("home-source-select")).toContain("docx");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("home-source-select-panel")).toBeNull();
  });

  it("PICKER-003 handles the required DOCX target category behavior", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    selectFormat("home-source-select", "docx");
    fireEvent.click(screen.getByTestId("home-target-select"));

    expect(activeCategory("home-target-select")).toBe("documents");
    expect(categoryIds("home-target-select")).toEqual(["documents", "images"]);
    expect(visiblePickerFormats("home-target-select")).toEqual(["html", "md", "odt", "pdf", "rtf", "txt"].sort());
    for (const hidden of ["png", "tiff", "epub", "mobi", "jpg", "tex", "rst"]) {
      expect(visiblePickerFormats("home-target-select")).not.toContain(hidden);
    }

    fireEvent.click(categoryButton("home-target-select", "images"));
    expect(activeCategory("home-target-select")).toBe("images");
    expect(visiblePickerFormats("home-target-select")).toEqual(["png", "tiff"].sort());
    for (const hidden of ["html", "md", "odt", "pdf", "rtf", "txt"]) {
      expect(visiblePickerFormats("home-target-select")).not.toContain(hidden);
    }

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("home-target-select"));
    expect(activeCategory("home-target-select")).toBe("documents");
  });

  it("PICKER-004 keeps a still-compatible target when source changes, and always reopens on the first category", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    selectFormat("home-source-select", "docx");
    fireEvent.click(screen.getByTestId("home-target-select"));
    fireEvent.click(categoryButton("home-target-select", "images"));
    fireEvent.click(optionButton("home-target-select", "png"));
    expect(screen.getByTestId("home-target-select").textContent).toContain("PNG");

    // jpg is also a valid source for png. With symmetric source/target
    // filtering, the source picker itself only ever offers sources
    // compatible with the current target — so a still-valid target is
    // correctly preserved, not reset, when the source changes.
    selectFormat("home-source-select", "jpg");
    expect(screen.getByTestId("home-target-select").textContent).toContain("PNG");
    fireEvent.click(screen.getByTestId("home-target-select"));
    expect(activeCategory("home-target-select")).toBe(categoryIds("home-target-select")[0]);
  });

  it("PICKER-005 searches globally and restores the active category when search clears", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    selectFormat("home-source-select", "docx");
    fireEvent.click(screen.getByTestId("home-target-select"));
    expect(activeCategory("home-target-select")).toBe("documents");
    fireEvent.change(searchInput(), { target: { value: "png" } });
    expect(visiblePickerFormats("home-target-select")).toEqual(["png"]);
    fireEvent.change(searchInput(), { target: { value: "" } });
    expect(activeCategory("home-target-select")).toBe("documents");
    expect(visiblePickerFormats("home-target-select")).toEqual(["html", "md", "odt", "pdf", "rtf", "txt"].sort());
  });

  it("PICKER-006 shows a no-results state", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    selectFormat("home-source-select", "docx");
    fireEvent.click(screen.getByTestId("home-target-select"));
    fireEvent.change(searchInput(), { target: { value: "definitely-not-a-format" } });
    expect(screen.getByText("No encontramos ningún formato")).toBeTruthy();
  });

  it("TOOLS-001, TOOLS-002 and TOOLS-005 classify tools separately", () => {
    render(<ToolHub model={model} onOpenTool={() => {}} />);

    expect(screen.getByRole("button", { name: /^PDF/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Imágenes/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Conversión con OCR/i })).toBeTruthy();
  });

  it("SOURCE-CONTRACT-001 restricts the picker when a source format is fixed", () => {
    render(
      <SourceSelector
        onUrlAnalyzed={() => {}}
        onFileAnalyzed={() => {}}
        isLoading={false}
        setLoading={() => {}}
        requiredSourceFormat="docx"
        requiredSourceLabel="DOCX"
      />
    );

    expect(screen.getByRole("button", { name: /seleccionar DOCX/i })).toBeTruthy();
    expect(screen.getByLabelText("Seleccionar archivo local").getAttribute("accept")).toBe(".docx");
  });
});

function selectFormat(testId: string, formatId: string) {
  fireEvent.click(screen.getByTestId(testId));
  fireEvent.change(searchInput(), { target: { value: formatId } });
  fireEvent.click(optionButton(testId, formatId));
}

function searchInput(): HTMLInputElement {
  return screen.getByPlaceholderText("Buscar formato, extensión o alias...") as HTMLInputElement;
}

function optionButton(testId: string, formatId: string): HTMLElement {
  const button = screen.getByTestId(`${testId}-panel`).querySelector(`[data-testid="${testId}-option"][data-format="${formatId}"]`);
  if (!(button instanceof HTMLElement)) throw new Error(`Missing option ${formatId} in ${testId}`);
  return button;
}

function categoryButton(testId: string, categoryId: string): HTMLElement {
  const button = screen.getByTestId(`${testId}-panel`).querySelector(`[data-testid="${testId}-category"][data-category="${categoryId}"]`);
  if (!(button instanceof HTMLElement)) throw new Error(`Missing category ${categoryId} in ${testId}`);
  return button;
}

function activeCategory(testId: string): string | null {
  return screen.getAllByTestId(`${testId}-category`)
    .find((button) => button.getAttribute("aria-selected") === "true")
    ?.getAttribute("data-category") ?? null;
}

function categoryIds(testId: string): string[] {
  return screen.getAllByTestId(`${testId}-category`).map((button) => button.getAttribute("data-category")).filter(Boolean) as string[];
}

function visiblePickerFormats(testId: string): string[] {
  return Array.from(screen.getByTestId(`${testId}-panel`).querySelectorAll(`[data-testid="${testId}-option"]`))
    .map((button) => button.getAttribute("data-format"))
    .filter(Boolean)
    .sort() as string[];
}

function getPickerUnion(testId: string): string[] {
  fireEvent.click(screen.getByTestId(testId));
  const values = new Set<string>();
  for (const categoryId of categoryIds(testId)) {
    fireEvent.click(categoryButton(testId, categoryId));
    for (const formatId of visiblePickerFormats(testId)) values.add(formatId);
  }
  fireEvent.keyDown(document, { key: "Escape" });
  return Array.from(values).sort();
}

function getSuggestionFormats(direction: "source" | "target"): string[] {
  return Array.from(screen.getByTestId(`suggestion-row-${direction}`).querySelectorAll("button"))
    .map((button) => button.getAttribute("data-format"))
    .filter(Boolean)
    .sort() as string[];
}
