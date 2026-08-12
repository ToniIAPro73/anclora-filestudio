import { normalizeFormatId } from "@/lib/domain/format-catalog";

/**
 * Resolves the inputFormat to pass to engines.
 * Priority: extension when authoritative > detectedFormat > extension > unknown.
 */
export function resolveInputFormatForJob(descriptor: {
  detectedFormat: string | null;
  extension: string | null;
}): string {
  const ext = descriptor.extension?.toLowerCase() ?? null;
  const detected = descriptor.detectedFormat?.toLowerCase() ?? null;

  const extensionAuthoritative: Record<string, string> = {
    md: "md",
    markdown: "markdown",
    html: "html",
    htm: "html",
    txt: "txt",
    rst: "rst",
    tex: "latex",
    latex: "latex",
  };

  if (ext && extensionAuthoritative[ext]) {
    return extensionAuthoritative[ext];
  }

  const structuredDataExts = new Set([
    "json",
    "yaml",
    "yml",
    "toml",
    "xml",
    "csv",
    "tsv",
  ]);
  if (ext && structuredDataExts.has(ext)) {
    return ext;
  }

  return detected ?? ext ?? "unknown";
}

export function validateExplicitRouteSource(
  expectedSource: string,
  actualSource: string,
): { valid: boolean; expected: string; actual: string } {
  const expected = normalizeFormatId(expectedSource) ?? expectedSource.toLowerCase();
  const actual = normalizeFormatId(actualSource) ?? actualSource.toLowerCase();
  return {
    valid: expected === actual,
    expected,
    actual,
  };
}
