// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatApproxBytes,
  RuntimePackRequirementCard,
} from "../../../src/components/converter/runtime-pack-requirement-card";

function installableStatus() {
  return {
    id: "chromium-runtime",
    productName: "Componente de renderizado web",
    description: "Esta conversión necesita el componente de renderizado web.",
    state: "NOT_INSTALLED",
    version: "151.0.7922.34",
    definition: {
      compressedSize: 193_282_658,
      installedSize: 610_000_000,
    },
    install: {
      status: "idle",
      progress: null,
      error: null,
      errorCode: null,
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RuntimePackRequirementCard", () => {
  it("PACKUX-001..003 shows installable copy and size without starting a download", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => installableStatus(),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RuntimePackRequirementCard
        packIds={["chromium-runtime"]}
        onInstalled={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText("Se necesita un componente adicional")).toBeTruthy();
    expect(screen.getByText("Componente de renderizado web")).toBeTruthy();
    expect(await screen.findByText("~193 MB")).toBeTruthy();
    expect(screen.getByText("Solo se instala una vez.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/runtime-packs/chromium-runtime");
  });

  it("PACKUX-004 cancels before download without posting install", async () => {
    const onCancel = vi.fn();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => installableStatus(),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RuntimePackRequirementCard
        packIds={["chromium-runtime"]}
        onInstalled={() => {}}
        onCancel={onCancel}
      />
    );

    await screen.findByText("~193 MB");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("PACKUX-002 starts installation only after explicit consent", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        ...installableStatus(),
        install: init?.method === "POST"
          ? { status: "downloading", progress: { percent: 12 }, error: null, errorCode: null }
          : installableStatus().install,
      }),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RuntimePackRequirementCard
        packIds={["chromium-runtime"]}
        onInstalled={() => {}}
        onCancel={() => {}}
      />
    );

    await screen.findByText("~193 MB");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Instalar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/runtime-packs/chromium-runtime", { method: "POST" }));
    expect(await screen.findByText("Descargando... 12%")).toBeTruthy();
  });

  it("PACKUX-009 shows a human download failure and retry action", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        ...installableStatus(),
        install: init?.method === "POST"
          ? {
              status: "failed",
              progress: null,
              error: "No se pudo descargar el componente.",
              errorCode: "RUNTIME_PACK_DOWNLOAD_FAILED",
            }
          : installableStatus().install,
      }),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RuntimePackRequirementCard
        packIds={["chromium-runtime"]}
        onInstalled={() => {}}
        onCancel={() => {}}
      />
    );

    await screen.findByText("~193 MB");
    fireEvent.click(screen.getByRole("button", { name: "Instalar" }));

    expect(await screen.findByText("No se pudo descargar el componente.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("PACKUX-011 shows a reinstall message when the pack is broken", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ...installableStatus(),
        state: "BROKEN",
        install: { status: "idle", progress: null, error: null, errorCode: null },
      }),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RuntimePackRequirementCard
        packIds={["chromium-runtime"]}
        onInstalled={() => {}}
        onCancel={() => {}}
      />
    );

    expect(await screen.findByText("El componente instalado debe reinstalarse.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("PACKUX-012 reports installed packs back to the conversion flow", async () => {
    const onInstalled = vi.fn();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ...installableStatus(),
        state: "AVAILABLE",
        install: { status: "idle", progress: null, error: null, errorCode: null },
      }),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RuntimePackRequirementCard
        packIds={["chromium-runtime"]}
        onInstalled={onInstalled}
        onCancel={() => {}}
      />
    );

    await waitFor(() => expect(onInstalled).toHaveBeenCalledTimes(1));
  });

  it("formats manifest sizes as approximate decimal megabytes", () => {
    expect(formatApproxBytes(201_068_834)).toBe("~201 MB");
  });
});
