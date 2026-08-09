# FileStudio - Wave 2 / Gate 2A

Functional QA - Vercel Web

Date: 2026-08-09  
Repository: `/home/toni/workspace/anclora/anclora-filestudio`  
Production target: `https://anclora-filestudio.vercel.app/`

Final verdict: **GATE 2A PASS WITH NON-BLOCKING FINDINGS**

## 1. Executive Summary

Vercel production is reachable and serves Anclora FileStudio Web. Core UI, desktop/tablet operation, representative DATA/IMAGE/PDF browser conversions, downloads, and output validation passed.

One non-blocking UX defect was found for corrupt PDF handling: the UI safely rejects the file and produces no download, but after clicking generate it exposes a raw internal error string.

## 2. Git Baseline

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD | `d3a8739 chore: prepare FileStudio for AOS-governed functional QA` |
| Required commit | `d3a87399eb66354ee4afadca97960da75a7b2d24` present |
| Initial status | clean |
| Final status | clean |

## 3. Deployment Validation

| Item | Result |
|---|---|
| Target | `https://anclora-filestudio.vercel.app/` |
| HTTP `/` | `200`, no redirects |
| Final URL | `https://anclora-filestudio.vercel.app/` |
| Page title | `Anclora FileStudio` |
| Visible identity | `Anclora FileStudio`, `Version Web` |
| `/api/health` | `200`, `status: web-production`, `deploymentTarget: vercel`, `effectivePlatform: vercel-web` |
| `/api/capabilities` | `200`, browser execution, uploads false, server conversions false |
| Console errors during QA | none captured |
| Failed relevant requests | none captured |
| Deployment correlation | DEPLOYMENT COMMIT NOT PROVEN |

## 4. Expected Vercel Capability Matrix

Sources inspected read-only:

- `vercel.json`
- `package.json`
- `docs/format-matrix.md`
- `docs/qa/FILESTUDIO_QA_STRATEGY.md`
- Browser conversion implementation under `src/lib/browser-conversion/**` and `src/lib/browser-tools/**`

| Family | Inputs | Outputs / Operations | Mode |
|---|---|---|---|
| Structured Data | JSON, YAML/YML, TOML, XML, CSV, TSV | 17 browser routes: JSON to YAML/TOML/XML/CSV/TSV; YAML to JSON/TOML/XML; TOML to JSON/YAML/XML; XML to JSON/YAML; CSV to TSV/JSON; TSV to CSV/JSON | browser |
| Image | JPEG/JPG, PNG, WebP | JPEG/JPG, PNG, WebP; convert, compress, resize, read EXIF, strip EXIF, batch | browser |
| PDF | PDF, JPEG/JPG, PNG, WebP | PDF/ZIP; merge, split, reorder, rotate, images-to-PDF | browser |
| Desktop-only | audio, video, Office/documents, ebooks, archives, OCR, advanced native engines | intentionally unavailable on Vercel Web | EXPECTED_LIMITATION |

Confirmed Vercel build/runtime settings from repository:

```text
ANCLORA_FILESTUDIO_DEPLOYMENT_TARGET=vercel
NEXT_PUBLIC_ANCLORA_FILESTUDIO_MODE=vercel-web
NEXT_PUBLIC_ENABLE_BROWSER_DATA_CONVERSIONS=true
ANCLORA_FILESTUDIO_ENABLE_SERVER_CONVERSIONS=false
ANCLORA_FILESTUDIO_ENABLE_CLOUD_UPLOADS=false
```

## 5. Functional UI Results

Homepage loaded, branding was correct, tabs/navigation worked, converter interfaces were reachable, file selectors worked, format selectors behaved according to source format, controls were usable, downloads were triggered, and no blocking JavaScript errors appeared.

Existing Playwright smoke against production passed:

```bash
PLAYWRIGHT_BASE_URL=https://anclora-filestudio.vercel.app PLAYWRIGHT_SKIP_WEB_SERVER=1 corepack pnpm@10.33.2 exec playwright test tests/e2e/app-smoke.spec.ts --project=chromium
```

Result:

```text
1 passed
```

## 6. Desktop Viewport Results

Viewport: `1365x900`

Result: PASS

Image, PDF, and structured-data tabs were usable. Evidence:

```text
/tmp/filestudio-gate2a-20260809-rerun/evidence/desktop-home.png
```

## 7. Tablet Viewport Results

Viewport: `768x1024`

Result: PASS

Primary controls remained visible and usable. CSV to TSV conversion completed and validated. Evidence:

```text
/tmp/filestudio-gate2a-20260809-rerun/evidence/tablet-home.png
```

## 8. Conversion QA Matrix

| ID | Input | Output/Operation | Mode | Result | Output Validated |
|---|---|---|---|---|---|
| DATA-01 | JSON | YAML | browser | PASS | YES |
| DATA-02 | CSV | JSON | browser | PASS | YES |
| DATA-03 | YAML | TOML | browser | PASS | YES |
| IMG-01 | PNG | WebP | browser | PASS | YES |
| PDF-01 | PNG | images-to-PDF | browser | PASS | YES |
| PDF-02 | PDF | rotate PDF | browser | PASS | YES |
| NEG-01 | malformed JSON | YAML | browser | PASS | no download, safe rejection |
| NEG-02 | empty JSON | YAML | browser | PASS | no download, safe rejection |
| NEG-03 | TXT unsupported | JSON | browser | PASS | no conversion controls |
| NEG-04 | CSV content as `.json` | YAML | browser | PASS | no download, safe rejection |
| NEG-05 | corrupt PDF | rotate PDF | browser | PASS | no download, safe rejection |
| TAB-01 | CSV | TSV | browser/tablet | PASS | YES |

Totals:

| Metric | Count |
|---|---:|
| TOTAL | 12 |
| PASS | 12 |
| FAIL | 0 |
| EXPECTED_UNSUPPORTED | 0 |
| BLOCKED | 0 |
| NOT_TESTED | 0 |

## 9. Output Validation Results

| ID | Validation Method | Output Size |
|---|---|---:|
| DATA-01 | YAML.parse | 80 bytes |
| DATA-02 | JSON.parse | 141 bytes |
| DATA-03 | TOML.parse | 39 bytes |
| IMG-01 | RIFF/WebP magic + dimension parse, `2x2` | 544 bytes |
| PDF-01 | PDF signature + `pdf-lib` page count, 1 page | 944 bytes |
| PDF-02 | PDF signature + `pdf-lib` page count, 1 page | 951 bytes |
| TAB-01 | TSV delimiter/content check | 62 bytes |

SHA-256 values were recorded in:

```text
/tmp/filestudio-gate2a-20260809-rerun/qa-results.json
```

## 10. Negative / Edge Case Results

| ID | Case | Result |
|---|---|---|
| NEG-01 | malformed JSON | PASS: no download, visible parser error |
| NEG-02 | empty JSON | PASS: no download, visible parser error |
| NEG-03 | unsupported TXT | PASS: unsupported file rejected by UI |
| NEG-04 | mismatched CSV content with `.json` extension | PASS: no download, visible parser error |
| NEG-05 | corrupt PDF | PASS: no download; non-blocking UX defect recorded |

## 11. Console / Network Findings

During automated functional flows:

| Signal | Count |
|---|---:|
| Console errors/warnings | 0 |
| Failed requests | 0 |
| Relevant failed HTTP responses | 0 |

## 12. Capability Advertising Consistency

The Vercel UI exposes Image, PDF, and structured-data browser tools, matching `/api/capabilities`.

Desktop/native categories are described as requiring Desktop and were not materially advertised as executable on Vercel Web.

No capability-advertising gate blocker was found.

## 13. Findings

### FUNCTIONAL DEFECT

None.

### UX DEFECT

ID: `FS-G2A-001`  
SEVERITY: LOW  
AREA: PDF corrupt-file error handling  
TEST ID: `NEG-05`  
REPRODUCTION STEPS: Open production target, go to PDF tab, choose `Rotar paginas`, upload truncated/corrupt PDF, click `Generar y descargar`.  
EXPECTED: UI should keep the safe rejection in user-facing language and prevent or handle generation without raw internal errors.  
ACTUAL: File row says `Este PDF esta protegido o no puede leerse en la version Web.`, but after clicking generate the status shows `Cannot read properties of undefined (reading 'Pages')`. No download is produced.  
EVIDENCE: `/tmp/filestudio-gate2a-20260809-rerun/evidence/corrupt-pdf-error.png`  
LIKELY COMPONENT: `src/components/web-tools/pdf/pdf-tool.tsx` / browser PDF error handling  
REPRODUCIBILITY: 100% with the corrupt PDF fixture  
BLOCKS_GATE_2A: NO

### DEPLOYMENT DEFECT

None.

### DOCUMENTATION MISMATCH

None found for tested Vercel capabilities.

### EXPECTED LIMITATION

Desktop/native engines are intentionally unsupported on Vercel Web.

## 14. Blockers

None.

## 15. Repository Final Status

`git status --short` returned clean for `/home/toni/workspace/anclora/anclora-filestudio`.

No source files were edited during QA.

QA artifacts were written under:

```text
/tmp/filestudio-gate2a-20260809-rerun
```

## 16. Recommended Next Action

Approve Gate 2A with the non-blocking PDF UX issue logged for later remediation.

