# FileStudio Tier 1 Coverage Roadmap

Generated: 2026-08-12T23:23:26.133Z

## Coverage Target

Recommended target before calling FileStudio competitive: Tier 1 coverage >= 90% with E2E probes for every newly declared edge.

Current Tier 1 coverage: 151/152 (99.3%).

## Quick Wins Without New Dependencies

| Conversion | Tier | Engines | Expected quality | Cost | Recommendation |
| --- | --- | --- | --- | --- | --- |

## Tier 1 Requiring New Dependencies

| Conversion | Blocker | Candidates | Recommendation |
| --- | --- | --- | --- |
| pdf->docx | No PDF layout extraction to DOCX adapter. | pdf2docx, PyMuPDF/MuPDF commercial, Unstructured/Docling pipeline | INVESTIGATE pdf2docx for MVP; avoid AGPL MuPDF/PyMuPDF unless commercial licensing is accepted. |

## Priority Matrix

| Conversion | Tier | User value | Current status | Engine | New dependency | Expected quality | Implementation cost | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pdf->docx | TIER 1 | High | No PDF layout extraction to DOCX adapter. | - | pdf2docx, PyMuPDF/MuPDF commercial, Unstructured/Docling pipeline | MEDIUM | MEDIUM/HIGH | P1 dependency investigation |
