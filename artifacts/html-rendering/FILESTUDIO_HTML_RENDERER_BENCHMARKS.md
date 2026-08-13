# FileStudio HTML Renderer Benchmarks

## Linux E2E

Runtime:

- Chrome for Testing 151.0.7922.34
- Playwright Chromium revision 1234
- Cache size observed: 389 MB
- Executable SHA256: `0b20b130e7edd9dd51873be867761295fe0cfad490c2b9a64f95bd3cfc08fa71`

## Renderer Tests

Command:

`corepack pnpm@10.33.2 vitest run tests/integration/html-renderer-engine.test.ts`

Result:

- 11 tests passed
- Covered runtime detection, HTML->PNG, CSS, tables, local image, Unicode, full-page, remote block, JS disabled, oversized guard, paths with spaces, cleanup, TIFF, MD->PNG and RST->PNG.

## Ranking Results

| Pair | Winner | Score | Band | Best challenger |
| --- | --- | ---: | --- | --- |
| `html->png` | `html->png` | 0.840 | good | `html->docx->pdf->png` at 0.577 |
| `html->tiff` | `html->tiff` | 0.840 | good | `html->docx->pdf->tiff` at 0.577 |
| `md->png` | `md->html->png` | 0.781 | good | `md->rst->html->png` at 0.588 |
| `md->tiff` | `md->html->tiff` | 0.726 | good | `md->docx->pdf->tiff` at 0.572 |
| `rst->png` | `rst->html->png` | 0.769 | good | `rst->md->html->png` at 0.580 |
| `rst->tiff` | `rst->html->tiff` | 0.715 | good | `rst->docx->pdf->tiff` at 0.564 |

## Matrix Impact

Before:

- Total effective pairs: 456
- Target not-recommended pairs: 6

After:

- Total effective pairs: 460
- Target not-recommended pairs: 0
- Tier 1: 152 / 152
- Tier 2: 40 / 40
- Tier 3: 4 / 6

Tier definitions were not changed.

## Audit Commands

- `corepack pnpm@10.33.2 dlx tsx scripts/audit-route-ranking.ts`
- `corepack pnpm@10.33.2 dlx tsx scripts/audit-conversion-discovery.ts`
- `corepack pnpm@10.33.2 dlx tsx scripts/audit-conversion-coverage.ts`

Coverage audit result:

- canonical formats: 50
- direct supported pairs: 236
- multistep supported pairs: 224
- total effective pairs: 460
- Tier 1: 152 / 152
- Tier 2: 40 / 40
- Tier 3: 4 / 6

