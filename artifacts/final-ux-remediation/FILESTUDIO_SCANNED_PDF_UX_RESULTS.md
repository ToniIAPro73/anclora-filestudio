# Scanned PDF UX Results

Status: PASS

Commit: 76a6441

## Result

Scanned-like PDF to DOCX now returns a human OCR message:

`Este PDF parece estar escaneado y no contiene texto editable suficiente. Para convertirlo a un documento editable necesitas usar OCR.`

## Verification

| Check | Result |
| --- | --- |
| OCRUX-001 normalized error | PASS, unit asserts `SCANNED_CONTENT_REQUIRES_OCR` at job level |
| OCRUX-002 no fallback | PASS, fallback was not called for scanned-content OCR guard |
| OCRUX-003 human-readable copy | PASS |
| OCRUX-004 no generic engine message | PASS |
| OCRUX-005 normal PDF to DOCX unaffected | PASS, fixture produced non-empty DOCX |
| OCRUX-006 mixed PDF behavior unchanged | PASS by existing PDF-DOCX engine tests |

## Evidence

- `api-results/scanned-pdf-docx-result.json`
- `api-results/normal-pdf-docx-result.json`
- `screenshots/scanned-pdf-ocr-history.png`
