# FileStudio UX Issue Register

### FS-FPA-001
- AREA: SOURCE CONTRACT
- SEVERITY: P0
- DESCRIPTION: Quick Converter DOCX→PNG preserved only target, so Markdown could be accepted and converted as MD→PNG.
- USER IMPACT: User intent is violated; product can return a successful result for the wrong selected source.
- ROOT CAUSE: Desktop shell stored selectedTarget but not selectedSource.
- RECOMMENDATION: Preserve source+target pair; restrict picker/drop; validate detected source before capability selection.
- FIXED THIS PHASE: YES
- COMMIT: not committed

### FS-FPA-002
- AREA: DIRECT URL / NAVIGATION
- SEVERITY: P1
- DESCRIPTION: Direct URLs /history, /diagnostics, /convert and /convert/docx/png return 404.
- USER IMPACT: Refresh/deep link/share workflows fail; release criterion for direct URL is not met.
- ROOT CAUSE: Top navigation is local React state on / only; no route pages or URL state sync.
- RECOMMENDATION: Add route-backed pages or URL query/hash state for top-level tabs and selected conversion.
- FIXED THIS PHASE: YES, closed in final UX remediation.
- COMMIT: 76a6441
- VERIFICATION: `/convert`, `/history` and `/diagnostics` return 200 in production and dev; refresh keeps page content and active nav.

### FS-FPA-003
- AREA: SCANNED PDF UX
- SEVERITY: P1
- DESCRIPTION: Image-only/scanned-like PDF→DOCX fails with generic engine execution message instead of explaining OCR requirement.
- USER IMPACT: User cannot understand that OCR is needed for editable text.
- ROOT CAUSE: PDF analysis does not classify scanned/image-only content for the normal conversion flow.
- RECOMMENDATION: Detect scanned PDFs before conversion and route to OCR-specific UX/actionable copy.
- FIXED THIS PHASE: YES, closed in final UX remediation.
- COMMIT: 76a6441
- VERIFICATION: New scanned-like PDF to DOCX job shows OCR guidance and unit coverage asserts `SCANNED_CONTENT_REQUIRES_OCR` with no fallback.

### FS-FPA-004
- AREA: RUNTIME PACK UX
- SEVERITY: P1
- DESCRIPTION: Chromium installable state is represented in capabilities/diagnostics, but no minimal install/confirmation UI was found in the conversion flow.
- USER IMPACT: On machines without Chromium pack, MD/HTML/RST→PNG/TIFF is discoverable only as a missing component path, not a complete product flow.
- ROOT CAUSE: Runtime pack architecture exists; product install action is not wired into normal converter.
- RECOMMENDATION: Add a small required-component panel: component name, purpose, approximate size, install-once, confirm/progress/error/success.
- FIXED THIS PHASE: YES, closed in final UX remediation.
- COMMIT: 76a6441
- VERIFICATION: Isolated missing-pack runtime shows install UI with product name, `~193 MB`, consent and cancel; backend remains gated with 428 until install.

### FS-FPA-005
- AREA: DISCOVERY
- SEVERITY: P2
- DESCRIPTION: Source-only Continue opens unfiltered Convert Hub and loses the chosen source.
- USER IMPACT: Source-first discovery is less predictable; user must re-discover targets.
- ROOT CAUSE: Quick Converter source-only path calls onOpenConvert without source context.
- RECOMMENDATION: Preserve source in hub state and filter target cards to effective targets.
- FIXED THIS PHASE: NO
- COMMIT: not committed

### FS-FPA-006
- AREA: HISTORY
- SEVERITY: P2
- DESCRIPTION: History default cards expose engine/loss metadata such as LibreOffice, Poppler and risk badges.
- USER IMPACT: Internal architecture leaks into a normal system page.
- ROOT CAUSE: History renders technical badges by default for universal jobs.
- RECOMMENDATION: Move engine/loss details behind an optional details disclosure; keep default to filename, source, target, status, date, duration/download.
- FIXED THIS PHASE: NO
- COMMIT: not committed

### FS-FPA-007
- AREA: MULTISTEP UX
- SEVERITY: P2
- DESCRIPTION: Conversion route summary shows intermediate segments like DOCX→PDF→PNG in the normal flow.
- USER IMPACT: Normal users see implementation mechanics before conversion.
- ROOT CAUSE: Route summary component optimizes for technical transparency rather than product simplicity.
- RECOMMENDATION: Default to concise copy such as “Convirtiendo a PNG”; keep route details collapsed under technical details.
- FIXED THIS PHASE: NO
- COMMIT: not committed

### FS-FPA-008
- AREA: PRODUCTION START
- SEVERITY: P2
- DESCRIPTION: pnpm start serves successfully but Next warns that standalone output should run via node .next/standalone/server.js.
- USER IMPACT: Release/start instructions can diverge from the built output mode.
- ROOT CAUSE: next.config uses output: standalone while package start uses next start.
- RECOMMENDATION: Add a production start script for standalone or adjust release runbook.
- FIXED THIS PHASE: NO
- COMMIT: not committed

### FS-FPA-009
- AREA: BUILD WARNINGS
- SEVERITY: P3
- DESCRIPTION: next build passes with Turbopack NFT tracing warnings for API routes.
- USER IMPACT: No observed runtime failure, but noisy release signal.
- ROOT CAUSE: Dynamic fs/config imports trace broad project paths.
- RECOMMENDATION: Review trace roots or add targeted Turbopack ignore/static scoping later.
- FIXED THIS PHASE: NO
- COMMIT: not committed

### FS-FPA-010
- AREA: DIAGNOSTICS
- SEVERITY: P3
- DESCRIPTION: Diagnostics shows shell commands and Windows/Linux setup helper in the main diagnostics view.
- USER IMPACT: Acceptable for diagnostics, but can feel more technical than the product principle wants.
- ROOT CAUSE: Diagnostics combines user status and install/runbook details.
- RECOMMENDATION: Keep status first; move command snippets into “Advanced install help”.
- FIXED THIS PHASE: NO
- COMMIT: not committed
