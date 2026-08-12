// @vitest-environment jsdom

// Component tests for the destination picker, route summary and technical
// details. Uses @testing-library/react with the jsdom environment
// (devDependencies already present in the repo).

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { DestinationPicker } from "../../../src/components/converter/destination-picker";
import { ConversionRouteSummary } from "../../../src/components/converter/conversion-route-summary";
import { TechnicalDetails } from "../../../src/components/converter/technical-details";
import { t } from "../../../src/i18n";
import type { CapabilityInfo } from "../../../src/lib/domain/unified-analysis";
import type { ConversionRouteSummary as RouteSummary } from "../../../src/lib/conversion-routing/types";

// ── Factories ─────────────────────────────────────────────────────────────────

function route(over: Partial<RouteSummary> = {}): RouteSummary {
  return {
    steps: [{ source: "jpeg", target: "png" }],
    classification: "direct",
    risk: "low",
    qualityBand: "excellent",
    recommended: false,
    ...over,
  };
}

function cap(over: Partial<CapabilityInfo> = {}): CapabilityInfo {
  return {
    id: "cap-png",
    outputFormat: "png",
    outputLabel: "PNG",
    state: "available",
    lossProfile: "lossless",
    engineId: "sharp-image",
    mobilePortability: "portable-domain",
    warnings: [],
    ...over,
  };
}

// ── DestinationPicker ─────────────────────────────────────────────────────────

describe("DestinationPicker", () => {
  it("renders destinations as radio cards inside a radiogroup", () => {
    const caps = [cap(), cap({ id: "cap-webp", outputFormat: "webp", outputLabel: "WebP" })];
    render(<DestinationPicker capabilities={caps} recommended={null} onSelect={() => {}} selectedKey={null} />);

    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("shows the recommended badge and section for route-recommended destinations", () => {
    const caps = [
      cap({ route: route({ recommended: true }) }),
      cap({ id: "cap-webp", outputFormat: "webp", outputLabel: "WebP", route: route() }),
    ];
    render(<DestinationPicker capabilities={caps} recommended={null} onSelect={() => {}} selectedKey={null} />);

    expect(screen.getByText(t("destinations.badge.recommended"))).toBeTruthy();
    expect(screen.getByText(t("destinations.recommended"))).toBeTruthy();
    expect(screen.getByText(t("destinations.all"))).toBeTruthy();
  });

  it("shows the multistep badge for multistep routes", () => {
    const caps = [
      cap({
        id: "route-jpeg-ico",
        outputFormat: "ico",
        outputLabel: "ICO",
        route: route({
          classification: "multistep",
          qualityBand: "good",
          steps: [
            { source: "jpeg", target: "png" },
            { source: "png", target: "ico" },
          ],
        }),
      }),
    ];
    render(<DestinationPicker capabilities={caps} recommended={null} onSelect={() => {}} selectedKey={null} />);

    expect(screen.getByText(t("destinations.badge.multistep"))).toBeTruthy();
  });

  it("shows the loss warning badge for lossy routes", () => {
    const caps = [cap({ route: route({ classification: "lossy", qualityBand: "format-loss" }) })];
    render(<DestinationPicker capabilities={caps} recommended={null} onSelect={() => {}} selectedKey={null} />);

    expect(screen.getByText(t("destinations.badge.lossy"))).toBeTruthy();
  });

  it("calls onSelect when a card is clicked", () => {
    const onSelect = vi.fn();
    const target = cap({ id: "cap-webp", outputFormat: "webp", outputLabel: "WebP" });
    render(<DestinationPicker capabilities={[cap(), target]} recommended={null} onSelect={onSelect} selectedKey={null} />);

    fireEvent.click(screen.getByText("WebP"));
    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it("navigates between cards with arrow keys and selects with Enter", () => {
    const onSelect = vi.fn();
    const caps = [cap(), cap({ id: "cap-webp", outputFormat: "webp", outputLabel: "WebP" })];
    render(<DestinationPicker capabilities={caps} recommended={null} onSelect={onSelect} selectedKey={null} />);

    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    expect(document.activeElement).toBe(radios[0]);

    fireEvent.keyDown(radios[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(radios[1]);

    fireEvent.keyDown(radios[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(radios[0]);

    fireEvent.keyDown(radios[0], { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(caps[0]);
  });

  it("filters destinations with the search input when there are many", () => {
    const formats = ["png", "webp", "avif", "tiff", "jpeg", "gif", "pdf", "docx", "odt", "txt", "html", "md", "ico"];
    const caps = formats.map((fmt) =>
      cap({ id: `cap-${fmt}`, outputFormat: fmt, outputLabel: fmt.toUpperCase() })
    );
    render(<DestinationPicker capabilities={caps} recommended={null} onSelect={() => {}} selectedKey={null} />);

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "webp" } });

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(1);
    expect(radios[0].textContent).toContain("WEBP");
  });

  it("shows the empty state when no destination is available", () => {
    render(
      <DestinationPicker
        capabilities={[cap({ state: "unavailable-tool" })]}
        recommended={null}
        onSelect={() => {}}
        selectedKey={null} />
    );

    expect(screen.getByText(t("destinations.empty"))).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});

// ── ConversionRouteSummary ────────────────────────────────────────────────────

describe("ConversionRouteSummary", () => {
  it("renders the full multistep path, classification and quality band", () => {
    const selected = cap({
      id: "route-docx-epub",
      outputFormat: "epub",
      outputLabel: "EPUB",
      route: route({
        classification: "multistep",
        qualityBand: "good",
        steps: [
          { source: "docx", target: "html" },
          { source: "html", target: "epub" },
        ],
      }),
    });
    const { container } = render(
      <ConversionRouteSummary cap={selected} inputName="documento.docx" inputFormat="docx" />
    );

    const text = container.textContent ?? "";
    expect(text).toContain("documento.docx");
    expect(text).toContain("DOCX");
    expect(text).toContain("HTML");
    expect(text).toContain("EPUB");
    expect(text).toContain(t("route.multistep"));
    expect(text).toContain(t("route.quality.good"));
    expect(text).toContain(t("route.local"));
  });

  it("handles a direct route without crashing", () => {
    const { container } = render(
      <ConversionRouteSummary cap={cap({ route: route() })} inputFormat="jpeg" />
    );
    expect(container.textContent).toContain(t("route.direct"));
  });
});

// ── TechnicalDetails ──────────────────────────────────────────────────────────

describe("TechnicalDetails", () => {
  it("is collapsed by default and shows the engine display name", () => {
    const { container } = render(<TechnicalDetails cap={cap()} />);

    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    expect(details?.hasAttribute("open")).toBe(false);
    expect(container.textContent).toContain(t("route.technicalDetails"));
    expect(container.textContent).toContain("Sharp");
    expect(container.textContent).toContain(t("route.privacy"));
  });
});

// ── CTA copy ──────────────────────────────────────────────────────────────────

describe("convert CTA copy", () => {
  it("builds 'Convertir a {FORMAT}' from the i18n key", () => {
    expect(t("convert.startTo", { format: "PDF" })).toBe("Convertir a PDF");
  });
});
