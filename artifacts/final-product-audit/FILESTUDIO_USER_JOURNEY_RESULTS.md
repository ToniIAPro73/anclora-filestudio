# FileStudio User Journey Results

| Journey | Flow | Status | Evidence |
| --- | --- | --- | --- |
| JOURNEY-001 | PDF→DOCX | PASS | API conversion completed; DOCX download non-empty. |
| JOURNEY-002 | PDF→ODT | PASS | API conversion completed; ODT download non-empty. |
| JOURNEY-003 | DOCX→PNG | PASS | API conversion completed; PNG download non-empty. UI source contract fixed. |
| JOURNEY-004 | PNG→PDF | PASS | API conversion completed; PDF download non-empty. |
| JOURNEY-005 | MD→PNG with Chromium available | PASS | API conversion completed through Pandoc + HTML renderer; PNG download non-empty. |
| JOURNEY-006 | MD→PNG without Chromium pack | PASS | Final UX remediation used isolated runtime-pack home: capability is installable, UI shows install panel, backend blocks execution until install. |
| JOURNEY-007 | AAC→MP3 | PASS | API conversion completed; MP3 download non-empty. |
| JOURNEY-008 | WMV→MP4 | PASS | API conversion completed; MP4 download non-empty. |
| JOURNEY-009 | wrong source file | PASS WITH FIX | Original audit reproduced wrong conversion; fixed picker/source preservation. Agent upload bypass could not complete, but DOM accept and tests verify contract. |
| JOURNEY-010 | scanned PDF rejection | PASS | Final UX remediation: scanned-like PDF→DOCX shows OCR guidance and no generic engine message. |
| JOURNEY-011 | fallback success | WARN | Existing observability/history metadata reviewed; no controlled primary-failure scenario executed in UI in this phase. |
| JOURNEY-012 | conversion final failure | PASS | Corrupt PDF rejected at analyze with human-readable corrupt input message. |
| JOURNEY-013 | source-first | WARN | Targets filter while selecting source; source-only Continue loses context (P2). |
| JOURNEY-014 | target-first | PASS | Source list filters when target selected. |
| JOURNEY-015 | direct Convert From | WARN | No route-backed Convert From page exists. |
| JOURNEY-016 | direct Convert To | PASS | `/convert` direct route returns 200 and shows Convert Hub. |
| JOURNEY-017 | History | PASS WITH ISSUES | Loads and downloads are present; technical badges leak (P2). |
| JOURNEY-018 | Diagnostics | PASS WITH ISSUES | Loads tool status and Chromium state; command snippets are technical (P3). |
| JOURNEY-019 | batch basic | WARN | Batch toolbar exists but full browser batch flow not certified in this pass. |
| JOURNEY-020 | runtime installable state | PASS | Isolated missing-pack runtime shows minimal install UI and no silent download. |
