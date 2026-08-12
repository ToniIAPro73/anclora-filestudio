# FileStudio Tier 1 Quick Wins — Matrix Diff

Generated: 2026-08-13

Source of truth: `src/lib/conversion-matrix/matrix.ts` (no parallel registry).
Metrics recomputed with `scripts/audit-conversion-coverage.ts`
(audit artifacts regenerated in place).

## Pairs

```text
DIRECT SUPPORTED PAIRS    BEFORE 192  →  AFTER 238   (+46)
MULTISTEP SUPPORTED PAIRS BEFORE 129  →  AFTER 202   (+73)
TOTAL EFFECTIVE PAIRS     BEFORE 321  →  AFTER 440   (+119)
```

## Tiers

```text
TIER 1  BEFORE 131/152  86.2%  →  AFTER 151/152  99.3%
TIER 2  BEFORE   —             →  AFTER  39/40   97.5%
TIER 3  BEFORE   —             →  AFTER   4/6    66.7%
```

## New direct edges (46)

PDF extraction (3):
- pdf→txt (poppler pdftotext)
- pdf→html (poppler pdftohtml)
- pdf→md (poppler pdftohtml + pandoc)

Image→PDF (4):
- png→pdf, jpg→pdf, webp→pdf, tiff→pdf (sharp-image + pdf-lib)

Office (5):
- docx→rtf, doc→rtf, odt→rtf (LibreOffice)
- odp→pdf, odp→pptx (LibreOffice)

Audio — AAC completes the cross set (34):
- aac→{mp3,wav,flac,m4a,ogg} (5 new direct pairs)
- {mp3,wav,flac,m4a,ogg}→aac (5 new direct pairs)
- plus extract-audio from wmv/ts into all 6 audio formats (12) and
  wmv/ts→gif implementation edges (declared=false, not counted as direct supported)

Video — WMV/TS inputs (6):
- wmv→{mp4,webm,mkv}
- ts→{mp4,webm,mkv}

(Exact +46 direct count includes the above enabled pairs; extract-audio/gif edges
from the new video inputs follow the same pre-existing cross rules for avi/mov.)

## Intermediate policy change

- pdf→txt, pdf→html, pdf→md: `supportsAsIntermediate=false`.
  Reason: §33/§79 — lossy extraction must not feed reconstruction routes.
  Effect: PDF→DOCX, PDF→EPUB, PDF→ODT remain unavailable instead of being
  "supported" through mediocre extraction chains.

## Remaining gaps after this phase

| Pair | Tier | Status | Reason |
| --- | --- | --- | --- |
| pdf→docx | T1 | UNAVAILABLE | Needs new dependency (pdf2docx or equivalent) — next phase |
| epub→docx | T2 | UNAVAILABLE | No canonical route within two intermediates |
| pdf→epub | T3 | UNAVAILABLE | No structured PDF reflow adapter |
| pdf→odt | T3 | UNAVAILABLE | No structured PDF reflow adapter |

## Discovery

`getAllEffectiveTargets()` / `getAllEffectiveSources()` pick up every new edge
automatically (verified in `tests/unit/conversion-matrix-quickwins.test.ts` and
via agent-browser UI smoke — no UI hardcodes).
