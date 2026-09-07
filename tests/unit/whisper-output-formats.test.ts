// Pure rendering functions for Whisper transcript outputs (TXT/MD/SRT/VTT —
// Fase 15/16/17). No process spawning involved: these operate on already
// real whisper-cli SRT output, verifying FileStudio's own post-processing
// never fabricates or summarizes content — only reformats real segments.

import { describe, expect, it } from "vitest";
import { parseSrt, buildTranscriptMarkdown, buildTimestampedTxt } from "../../src/lib/engines/media/whisper-engine";

const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:03,500
Hola, esto es una prueba.

2
00:00:03,500 --> 00:00:07,200
Segunda frase de la transcripción.
`;

describe("parseSrt", () => {
  it("extracts start-time labels (HH:MM:SS) and text per segment", () => {
    const segments = parseSrt(SAMPLE_SRT);
    expect(segments).toEqual([
      { startLabel: "00:00:00", text: "Hola, esto es una prueba." },
      { startLabel: "00:00:03", text: "Segunda frase de la transcripción." },
    ]);
  });

  it("returns an empty array for an SRT with no cues (no speech detected)", () => {
    expect(parseSrt("")).toEqual([]);
  });

  it("joins multi-line cue text into a single line", () => {
    const multiline = `1\n00:00:00,000 --> 00:00:02,000\nLínea uno\nLínea dos\n`;
    expect(parseSrt(multiline)).toEqual([{ startLabel: "00:00:00", text: "Línea uno Línea dos" }]);
  });
});

describe("buildTimestampedTxt", () => {
  it("renders one '[HH:MM:SS] text' line per segment", () => {
    const segments = parseSrt(SAMPLE_SRT);
    expect(buildTimestampedTxt(segments)).toBe(
      "[00:00:00] Hola, esto es una prueba.\n[00:00:03] Segunda frase de la transcripción."
    );
  });

  it("returns an empty string when there are no segments", () => {
    expect(buildTimestampedTxt([])).toBe("");
  });
});

describe("buildTranscriptMarkdown — Fase 16 format, no summarization", () => {
  const meta = {
    title: "entrevista.mp4",
    source: "entrevista.mp4",
    durationLabel: "00:00:07",
    language: "Español",
    processedAtIso: "2026-01-01T00:00:00.000Z",
  };

  it("includes only the header fields and real segment text — no generated commentary", () => {
    const segments = parseSrt(SAMPLE_SRT);
    const md = buildTranscriptMarkdown(meta, segments, true);

    expect(md).toContain("# entrevista.mp4");
    expect(md).toContain("Fuente: entrevista.mp4");
    expect(md).toContain("Duración: 00:00:07");
    expect(md).toContain("Idioma: Español");
    expect(md).toContain("Fecha de procesamiento: 2026-01-01T00:00:00.000Z");
    expect(md).toContain("## Transcripción");
    expect(md).toContain("### 00:00:00\nHola, esto es una prueba.");
    expect(md).toContain("### 00:00:03\nSegunda frase de la transcripción.");
    // Never fabricate a summary / key-points section.
    expect(md.toLowerCase()).not.toContain("resumen");
    expect(md.toLowerCase()).not.toContain("ideas principales");
  });

  it("renders continuous text (no ### blocks) when timestamps are disabled", () => {
    const segments = parseSrt(SAMPLE_SRT);
    const md = buildTranscriptMarkdown(meta, segments, false);
    expect(md).not.toContain("###");
    expect(md).toContain("Hola, esto es una prueba. Segunda frase de la transcripción.");
  });

  it("states plainly that no speech was detected instead of fabricating content", () => {
    const md = buildTranscriptMarkdown(meta, [], true);
    expect(md).toContain("Sin voz detectada en el audio.");
  });
});
