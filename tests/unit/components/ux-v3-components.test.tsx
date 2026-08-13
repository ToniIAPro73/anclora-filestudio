// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversionHub } from "../../../src/components/ux-v3/conversion-hub";
import { SourceSelector } from "../../../src/components/converter/source-selector";
import { FileStudioHome } from "../../../src/components/ux-v3/file-studio-home";
import { ToolHub } from "../../../src/components/ux-v3/tool-hub";
import { buildConversionUxModel } from "../../../src/lib/ux-v3/conversion-ux-model";

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

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "docx" } });
    const destination = screen.getByLabelText("A") as HTMLSelectElement;
    const values = Array.from(destination.options).map((option) => option.value);

    expect(values).toContain("pdf");
    expect(values).toContain("png");
  });

  it("QUICK-001b preserves source when continuing with a complete pair", () => {
    const onSelectTarget = vi.fn();
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={onSelectTarget} onOpenTools={() => {}} />);

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "docx" } });
    fireEvent.change(screen.getByLabelText("A"), { target: { value: "png" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onSelectTarget).toHaveBeenCalledWith("png", "docx");
  });

  it("QUICK-002 filters source when target is selected first", () => {
    render(<FileStudioHome model={model} onOpenConvert={() => {}} onSelectTarget={() => {}} onOpenTools={() => {}} />);

    fireEvent.change(screen.getByLabelText("A"), { target: { value: "pdf" } });
    const source = screen.getByLabelText("De") as HTMLSelectElement;
    const values = Array.from(source.options).map((option) => option.value);

    expect(values).toContain("docx");
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
