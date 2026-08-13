# FileStudio Execution Cost Model

**Phase:** MONETIZATION & EXECUTION COST MODEL (analysis and product design only)
**Date:** 2026-08-13
**Status:** ANALYSIS ONLY — no code changes, no pricing implementation, no routing changes.

## 1. Fundamental separation

Three layers, strictly separated:

| Layer | Owner today | Rule |
| --- | --- | --- |
| QUALITY | `src/lib/conversion-routing/` (quality-aware router, quality bands, bottleneck scoring) | Decides the best technical route. Never influenced by price. |
| EXECUTION COST | This model (future `ExecutionCostProfile`) | Estimated after route selection. Describes resource cost, never feeds back into ranking. |
| COMMERCIAL POLICY | Future `evaluateProductPolicy(...)` | Applied after cost estimation. May limit size/volume/cloud usage. Never selects a worse route. |

Canonical flow:

```text
source
  -> quality-aware route selection   (best technical route)
  -> execution cost estimation       (ExecutionCostProfile)
  -> product policy                  (plan, limits, credits)
  -> execution
```

Forbidden: price influencing route selection. A free user must never receive a deliberately worse route (see `NO QUALITY PAYWALL` in the monetization model).

## 2. Cost dimensions

Audited against the codebase. "Captured" = already recorded somewhere today.

| Dimension | Desktop local | Web/Vercel today | Future cloud | Captured today |
| --- | --- | --- | --- | --- |
| CPU | User device | N/A (no server conversions) | Real cost (billed per vCPU/s or serverless ms) | No |
| RAM | User device | N/A | Real cost (serverless memory x duration) | No |
| Disk temp | User device (`disk-space-check.ts` gate: `inputSize x 2 x totalSteps`) | N/A | Ephemeral storage cost | Gate only, not persisted |
| Execution time | User device | N/A | Primary billing unit | Yes — `durationMs` per step/attempt/conversion |
| Download bandwidth | User network (yt-dlp, runtime packs) | Browser fetch only | Ingress (usually free) | No |
| Upload bandwidth | None (local-first) | N/A | Egress to user (real cost on most clouds) | No |
| Runtime pack size | One-time user download (Chromium 193-201 MB compressed / 407-447 MB installed) | N/A | Cold-start + storage | Yes — pinned sizes in `src/lib/runtime-packs/registry/chromium.ts` |
| Engine startup cost | User device (LibreOffice ~seconds, Chromium ~1 s) | N/A | Cold start multiplier | Indirectly via step `durationMs` |
| External service cost | None (all local engines) | None | Possible (external APIs) | N/A |
| Storage | User disk | N/A | Output/object storage + TTL | Sizes captured (`inputs.size_bytes`, `artifacts.size_bytes`, `jobs.file_size_bytes`) |
| Concurrency | `MAX_CONCURRENT_JOBS=2`, batch default 2, LibreOffice serialized per profile | N/A | Queue depth, instance scaling | Partially (batch tables) |
| Failure/fallback cost | Extra user-device time (max 1 fallback attempt) | N/A | Doubled compute on retry | Yes — attempts[], `fallbackUsed`, `fallbackReason`, error taxonomy |

Key finding: **CPU, RAM and I/O are not measured anywhere** (`src/` has no `cpuUsage`/`memoryUsage` instrumentation). Duration and sizes are captured; compute intensity must currently be inferred from engine identity + duration.

## 3. Desktop vs Web cost separation

### Desktop local

- Marginal business cost per conversion is effectively **zero**: CPU, RAM, disk, temp storage and execution time are borne by the user's device.
- Business costs that do exist locally: distribution (installer/runtime packs), support, development. These are fixed/periodic, not per-conversion.
- Consequence: a computationally heavy local conversion (large video transcode, OCR) is **not** a per-unit business cost and must not be monetized as if it were cloud compute. It may justify premium *features* (batch, automation) by user value, not by cost.

### Web (Vercel) today

- Server conversions are disabled (`areServerConversionsEnabled()` = false on Vercel; API routes return `desktopRequiredResponse()`).
- Only browser-only tools run: images (canvas/exifr), PDF merge/split/rotate (pdf-lib), structured data, ZIP (fflate) — all client-side, marginal server cost ~0 (static hosting + small API responses).
- Therefore **today's Web cost per conversion is also effectively zero** — because compute happens in the user's browser.

### Future cloud processing

- UNKNOWN exact cost: no productive cloud infrastructure exists. Do not invent numbers.
- Classifiable by band using captured duration + size + engine profile once measured.
- Expected dominant drivers: serverless duration x memory (video, OCR), egress (large outputs), storage TTL, Chromium cold starts.

## 4. Engine inventory and cost profile

Source of truth: `src/lib/engines/registry.ts` (12 registered engines) + yt-dlp (unregistered, `src/lib/media/processor.ts`).

| Engine | Execution | Native binary | Startup | CPU | RAM | Temp | Size footprint | License | Optional runtime | Expected usage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sharp | In-process (N-API/libvips) | Bundled lib | ~0 | Low-Med (scales with MPx) | Med (pixel buffers) | Low | npm dep | Apache-2.0 (libvips LGPL dyn-linked) | No | High |
| Data (TS) | In-process pure TS | No | ~0 | Very low | Very low | None | npm deps | MIT-family | No | Medium |
| pdf-lib | In-process (via Sharp engine + browser) | No | ~0 | Low | Low | Low | npm dep | MIT | No | High |
| QPDF | Spawn, 120 s timeout | Yes | Low (~50 ms) | Low | Low | Low | ~MBs | Apache-2.0 | No | Medium |
| Poppler | Spawn (`pdftoppm`/`pdftotext`/`pdftohtml`), 120 s | Yes | Low | Med (raster per page x DPI) | Med | Med (page images) | ~MBs | GPL-2.0 (process-separated) | No | High |
| 7-Zip | Spawn, 300 s | Yes | Low | Med (compression) | Low-Med | High (repack) | ~MBs | LGPL-2.1 + unRAR restriction | No | Medium |
| Pandoc | Spawn + portable data-dir | Yes | Low-Med (~100-300 ms) | Low | Low | Low | ~50-150 MB | GPL-2.0+ (process-separated) | No | High |
| LibreOffice | Spawn headless, 300 s, **serialized per profile** | Yes | **High (seconds)** | Med-High | High (~300 MB footprint) | Med | ~300 MB+ | LGPL-3.0 | No | High |
| FFmpeg | Spawn (`ffmpeg`/`ffprobe`), 300 s | Yes | Low | **High (video) / Med (audio)** | Med | High (intermediates) | ~80-150 MB | GPL-2.0-or-later per `toolchain.lock.json` — **docs conflict with `third-party-licenses.md` (LGPL); unify** | No | High |
| Calibre (`ebook-convert`) | Spawn, 120 s, 50 MB input cap | Yes | Med-High (Python runtime) | Med | Med-High | Med | ~200-400 MB | GPL-3.0 (process-separated) | No | Medium |
| Tesseract | Spawn, 120 s, max 50 PDF pages, 300-600 DPI | Yes | Med | **High (per page)** | Med-High | High (rasterized pages) | ~MBs + tessdata | Apache-2.0 | No | Low-Med |
| Chromium renderer | Playwright-core + Chromium binary, isolated profile, net blocked | Yes | **High (~1 s browser launch)** | Med | High (~200-400 MB) | Med | **193-201 MB dl / 407-447 MB installed** | BSD-style | **Yes — `chromium-runtime`** | Medium |
| Background removal | Deterministic: in-process Sharp. AI: `onnxruntime-node` + ONNX model (optional dep) | Optional | Med (model load) | High (AI mode) | High (AI mode) | Low | model file | Apache-2.0 models only (RMBG-1.4 NC excluded) | Model file (not a formal pack) | Low |
| yt-dlp | Spawn (outside engine registry) | Yes | Low | Low | Low | Med | ~MBs | Unlicense | No | Medium |

## 5. Route cost profile (design, not implemented)

```ts
// Conceptual only — do NOT implement in this phase.
interface ExecutionCostProfile {
  computeCost: "very_low" | "low" | "medium" | "high" | "very_high";
  memoryCost: "very_low" | "low" | "medium" | "high" | "very_high";
  startupCost: "negligible" | "low" | "medium" | "high";
  ioCost: "very_low" | "low" | "medium" | "high";
  bandwidthCost: "none" | "low" | "medium" | "high";
  runtimePackRequirement: string | null;   // e.g. "chromium-runtime"
  estimatedDuration: { basis: "size" | "pages" | "durationSeconds" | "pixels" | "flat";
                       typicalMs?: number };
  fallbackRisk: "low" | "medium" | "high";
}
```

Placement: computed **after** `rankRoutes()` selects the winner (jobs-route currently stores `rankedRoutes` in `options_json`). Never an input to ranking — note `ranking.ts` already uses `runtimeCost` **only as a final tie-breaker among equal-quality routes**, which is acceptable and must stay a tie-breaker.

## 6. Cost bands

Bands express **resource intensity**, not euros. Desktop: intensity on the user's device. Cloud: proxy for relative billing impact. Cloud exact cost: UNKNOWN (no productive infra).

| Band | Meaning | Typical drivers |
| --- | --- | --- |
| VERY_LOW | Sub-second, in-process or trivial spawn | data transforms, txt->md, qpdf linearize |
| LOW | Fast spawn or small in-process work | image convert (small), pdf merge/split, audio short clips, remux |
| MEDIUM | Noticeable time/memory, or moderate startup | pdf raster (few pages), calibre, audio transcode (album), html render, pandoc large docs |
| HIGH | Heavy startup + compute, or large inputs | LibreOffice import/export, video transcode (short/medium), OCR (few pages), bg-removal AI |
| VERY_HIGH | Long compute, scales hard with input | large video transcode, OCR many pages (50 x 600 DPI), large batch of HIGH jobs |

## 7. Cost matrix — representative set

Quality bands from the router; runtime pack from the matrix; Desktop band = device intensity; Web band: Vercel today is N/A unless browser-only (then ~0 marginal); "Cloud est." = relative future band.

| Conversion | Best route | Engine(s) | Quality | Desktop cost | Web (Vercel today) | Cloud est. | Runtime pack | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TXT->MD | direct | pandoc | excellent/good | VERY_LOW | N/A | VERY_LOW | No | Trivial |
| JSON<->YAML/CSV etc. | direct | data-ts (in-process) | excellent | VERY_LOW | Browser-only (~0) | VERY_LOW | No | Also runs in browser |
| PNG->PDF / image->PDF | direct | sharp + pdf-lib | benchmarked | LOW | Partially browser (images-to-pdf) | LOW | No | Scales with MPx (cap 256 MPx) |
| PDF->TXT (text layer) | direct | poppler pdftotext | good | LOW | N/A | LOW | No | Rejects scanned (no OCR fallback) |
| PDF->PNG | direct | poppler pdftoppm | benchmarked 0.95 | MEDIUM | N/A | MEDIUM | No | Scales pages x DPI |
| DOCX->RTF | direct | libreoffice | engine-inferred | MEDIUM | N/A | MEDIUM | No | Startup-dominated; serialized profile |
| DOCX->PDF | direct | libreoffice | benchmarked | MEDIUM | N/A | MEDIUM | No | Same |
| DOCX->PNG | multistep | libreoffice -> poppler | good | HIGH | N/A | HIGH | No | Two engines chained |
| PDF->DOCX | direct | libreoffice pdf-import | benchmarked, requiresTextLayer | HIGH | N/A | HIGH | No | Scanned input fails functionally (no fallback by design) |
| PDF->ODT | direct | libreoffice pdf-import | benchmarked | HIGH | N/A | HIGH | No | Same |
| MD->PNG | multistep | pandoc -> html-renderer | benchmarked both steps | HIGH | N/A | HIGH | **chromium-runtime** | 428 RUNTIME_PACK_REQUIRED if pack missing |
| HTML->PNG | direct | html-renderer (Chromium, JS off, net blocked) | benchmarked | MEDIUM-HIGH (startup) | N/A | MEDIUM-HIGH (cold start) | **chromium-runtime** | 24 MPx / 16000 px caps |
| EPUB->PDF | direct | calibre | structural-risk | MEDIUM | N/A | MEDIUM | No | Irreversible structure loss documented |
| AAC->MP3 | direct | ffmpeg transcode | 0.88 | MEDIUM | N/A | MEDIUM | No | Scales with duration |
| WAV->MP3 | direct | ffmpeg transcode | 0.88 | MEDIUM | N/A | MEDIUM | No | Same |
| WMV->MP4 | direct | ffmpeg transcode | 0.9 | HIGH | N/A | HIGH | No | Duration x resolution |
| TS->MP4 | direct | ffmpeg transcode | high | HIGH | N/A | HIGH | No | Only ->MKV uses stream copy |
| MP4->WEBM | direct | ffmpeg transcode (VP8/9/AV1) | 0.82 | HIGH | N/A | HIGH | No | Always re-encode |
| Large video transcode (long/4K) | direct | ffmpeg | per route | VERY_HIGH | N/A | VERY_HIGH | No | Prime cloud-cost risk |
| MKV->MP4 (remux) | direct | ffmpeg stream copy | lossless | LOW | N/A | LOW | No | Cheap — do not conflate with transcode |
| OCR (img->txt/pdf, pdf->txt) | direct | tesseract (+poppler raster) | mode:"ocr" | HIGH (few pages) / VERY_HIGH (50 pages) | N/A | HIGH/VERY_HIGH | No | Per-page raster + OCR; excluded from default graph (UX-only today) |
| BG removal (AI) | direct | onnxruntime + model | n/a | HIGH | N/A | HIGH | model file | Deterministic mode is LOW |
| Archive repack | direct | 7zip | lossless | MEDIUM (I/O bound) | N/A | MEDIUM | No | Expansion guards: 100x ratio, 10k entries, 2 GB |

Heaviest current conversions: large FFmpeg video transcode; Tesseract OCR at high page counts/DPI; LibreOffice->Poppler multistep raster chains; Chromium renders at max dimensions.

Cheapest current conversions: data-ts transforms, TXT->MD, QPDF ops, PDF merge/split (pdf-lib), small image ops (Sharp), remux.

## 8. Input-size dependence

Cost must scale with real input signals, not just the pair. Available today in `inputs.attributes_json` / `FileAttributes` (`pageCount`, `durationSeconds`, `width`, `height`) and `inputs.size_bytes`:

- PDF raster/OCR: ~ linear in `pageCount x DPI`.
- Audio/video: ~ linear in `durationSeconds`; video also in `pixels x fps` and codec.
- Images/renders: ~ linear in pixels (capped: 256 MPx Sharp, 24 MPx renderer).
- Archives/data: ~ linear in bytes.

Conceptual future estimator (pure model only):

```ts
estimateExecutionCost({ source, target, route, sourceAnalysis })
// -> ExecutionCostProfile, using pageCount/durationSeconds/dimensions/sizeBytes
// when present; conservative defaults when absent.
```

Rule: if the estimate is unavailable on local Desktop, **never block the job** (Section 80).

## 9. Fallback and failure cost policy (recommended future rules)

- **Charge on success, not on attempt.** If the first route fails and fallback succeeds, the user pays for one successful job, never double.
- **Technical failure (ENGINE_TIMEOUT, ENGINE_CRASH, IO...): never charged.** Internal failures are FileStudio's cost, not the user's.
- **User-content error (CORRUPT_INPUT, invalid input, scanned-without-OCR acceptance): not charged.** Job never produced value.
- Fallback today is bounded (`maxFallbackAttempts: 1`, score >= 0.55, delta <= 0.18, no failure-domain overlap), so worst-case duplicate compute is 2x — acceptable and observable via `attemptCount`.

## 10. Cost observation plan (future, local/anonymized, opt-in)

Already captured — reuse, don't reinvent:

- `durationMs` at conversion/attempt/step granularity; engineId per step; routeId + score + quality band; attemptCount, fallbackUsed/Reason; error taxonomy (18 codes, 6 classes); outputSize per step; input `size_bytes`; output `file_size_bytes`/`artifacts.size_bytes`; `pageCount`/`durationSeconds`/dimensions in `inputs.attributes_json` (needs join input->job); batch tables.

Gaps to close later (design only):

- CPU/RAM per job: not measured anywhere. Options: optional local benchmark harness per engine (fixed fixtures, dev-time), or OS-level sampling during jobs — dev-tooling only, no new runtime deps in this phase.
- Join content attributes into execution metadata (or read via input join) so cost regression per engine is possible.
- Local-only aggregate metrics with explicit user consent; **never collect content**, never send telemetry externally without an explicit, separate decision.
- `apps/api` already has Prometheus-style counters (`jobs_created_total`, `job_duration_seconds`, `storage_bytes`, `download_bytes`) — the future cloud cost loop should hook there.

## 11. Cloud cost certainty

**UNKNOWN.** No productive cloud infrastructure exists; Vercel Web performs no server conversions. All cloud figures in this model are relative bands, not euros. First cloud deployment must run a measurement period before any usage-based price is fixed.
