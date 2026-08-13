# FileStudio PDF -> ODT Quality Results

Generated: 2026-08-13

## Quality Profile

| Dimension | Result | Notes |
| --- | --- | --- |
| Text | high | Text-layer PDFs produce editable ODT text. |
| Headings | good | Heading text is retained; semantic heading styles are partially reconstructed. |
| Paragraphs | good | Paragraph text and practical order are retained in representative fixtures. |
| Tables | acceptable/degraded | Cell content is retained; ODT table structures are not guaranteed. |
| Images | good | Embedded image resources are retained in ODT `Pictures/` entries. |
| Layout | acceptable | Layout is reconstructed by LibreOffice and can use frames/positioning. |
| Multipage | good | Text from multiple pages is retained. |
| Unicode | good | Validated with `áéíóú`, `ñ`, `€`, `αβγ`, `ΔΩ`. |
| Metadata | partial/low | PDF document metadata is not treated as high-fidelity output. |

Irreversible losses:

- table structure where LibreOffice flattens or positions content
- semantic styles/headings where PDF source lacks editable structure
- layout fidelity where PDF positioning cannot map cleanly to ODT flow

## Fixture Results

| Fixture | Case | Result |
| --- | --- | --- |
| PDFODT-001 | simple text | PASS |
| PDFODT-002 | headings + paragraphs | PASS |
| PDFODT-003 | multipage | PASS |
| PDFODT-004 | Unicode | PASS |
| PDFODT-005 | table | PASS, table structure documented as degraded |
| PDFODT-006 | image | PASS |
| PDFODT-007 | table + image | PASS |
| PDFODT-008 | columns/layout | PASS |
| PDFODT-009 | scanned PDF | PASS as controlled rejection, no OCR added |
| PDFODT-010 | path with spaces | PASS |

## Text PDF

Supported. The direct LibreOffice import/export path produces real ODT files with editable text and valid OpenDocument structure.

## Scanned PDF

Rejected without OCR. This phase does not add OCR to PDF -> ODT. The engine uses the existing `pdftotext` guard and returns a controlled OCR-required error instead of creating a misleading empty editable document.

## Mixed PDF

Supported with warning. Text-layer content and embedded images are retained in representative mixed fixtures. Quality remains layout-sensitive, and table/semantic reconstruction is degraded.

## Roundtrip

LibreOffice roundtrip `ODT -> PDF` passed for a generated PDF -> ODT output. The roundtrip verifies that LibreOffice can reopen the produced ODT and export it without corruption.

## Routing

`pdf -> odt` is the direct route winner. The current ranking reason is `ONLY_VIABLE_ROUTE`; there is no certified challenger route and no artificial intermediate route was introduced.

`pdf -> epub` remains unavailable.
