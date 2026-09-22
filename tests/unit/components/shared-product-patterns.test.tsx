// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebFileDropzone } from "../../../src/components/converter/web-file-dropzone";
import { JobProgressCard } from "../../../src/components/converter/job-progress-card";
import { BatchActionToolbar } from "../../../src/components/converter/batch-action-toolbar";

afterEach(() => cleanup());

describe("Wave 8 shared product pattern composition", () => {
  it("keeps file selection keyboard-addressable and reports invalid files contextually", () => {
    render(<WebFileDropzone onFileSelected={vi.fn()} onFileCleared={vi.fn()} selectedFile={null} />);

    const input = screen.getByLabelText("Seleccionar archivo para convertir");
    expect(input.getAttribute("type")).toBe("file");
    expect(screen.getByText("selecciona uno").closest("label")).toBeTruthy();

    fireEvent.change(input, { target: { files: [new File(["{}"], "notes.exe", { type: "application/octet-stream" })] } });
    expect(screen.getByText("Archivo no compatible")).toBeTruthy();
  });

  it("does not invent a determinate percentage when processing has no measured value", () => {
    render(<JobProgressCard jobId="qa-job" status="processing" stage="Analizando" progress={0} />);

    const progress = screen.getByRole("progressbar");
    expect(progress.getAttribute("aria-valuenow")).toBeNull();
    expect(progress.getAttribute("aria-label")).toBe("Procesando");
    expect(screen.getByText("En curso")).toBeTruthy();
  });

  it("keeps the batch action surface hidden for a single job and exposes actions for a real batch", () => {
    const jobs = [
      { id: "one", fileName: "one.pdf", status: "completed" as const, downloadUrl: "/one.pdf" },
      { id: "two", fileName: "two.pdf", status: "failed" as const },
    ];

    const { rerender } = render(<BatchActionToolbar jobs={[jobs[0]]} />);
    expect(screen.queryByText("Opciones de lote")).toBeNull();

    rerender(<BatchActionToolbar jobs={jobs} />);
    expect(screen.getByText("2 archivos preparados")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Descargar todo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Cambiar nombres/i })).toBeTruthy();
  });
});
