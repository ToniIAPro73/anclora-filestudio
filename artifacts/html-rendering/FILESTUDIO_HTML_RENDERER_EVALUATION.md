# FileStudio HTML Renderer Evaluation

Date: 2026-08-13

## Decision Matrix

| Candidate | Quality | CSS | Fonts | SVG | Security | Windows | Linux | License | Bundle Size | Runtime Cost | Maintenance | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Playwright Core + locked Chromium runtime | High | Modern Chromium | System/local web fonts | Native Chromium | Strong controls through context, request routing, no user profile | Reproducible future bundle under `tools/chromium` | E2E passed using Playwright cache Chromium 1234 | Apache-2.0 wrapper; Chromium notices required for browser bundle | JS package 14 MB; Chromium cache 389 MB | Medium startup/memory | Active | ADOPT |
| Raw headless Chromium CLI | High | Modern Chromium | System/local web fonts | Native Chromium | Possible, but custom process and network policy needed | Reproducible bundle possible | Available if binary exists | Chromium notices required | Chromium only, about 389 MB observed | Medium | Active upstream, custom adapter burden | REJECT |
| Puppeteer / Puppeteer Core | High | Modern Chromium | System/local web fonts | Native Chromium | Similar controls, but install path tends to browser download or custom resolver | Reproducible bundle possible | Good | Apache-2.0 wrapper; Chromium notices | Similar Chromium size | Medium | Active | REJECT |
| `node-html-to-image` | High | Chromium via Puppeteer | Browser-backed | Browser-backed | Adds wrapper and templating surface over Puppeteer | Same as Puppeteer | Same as Puppeteer | Apache-2.0 | Puppeteer-sized | Medium | Lower direct control | REJECT |
| `wkhtmltoimage` | Medium/low for modern CSS | Old Qt WebKit | Limited | Partial | CLI can disable JS, but old engine surface | Static packages exist | Static packages exist | LGPLv3 | Smaller than Chromium | Low/medium | Stale, stable release 0.12.6 from 2020 | REJECT |
| DOM/canvas libraries (`html-to-image`, `dom-to-image-more`) | Medium for DOM nodes, not files | Browser DOM required | Browser-dependent | SVG/canvas serialization limits | Runs in browser page, not desktop file renderer | Not a standalone desktop renderer | Browser-only | MIT variants | Small | Low | Maintained variants exist | REJECT |
| System Chrome fallback | High when present | Modern Chromium | User/system dependent | Native Chromium | Cannot depend on user profile or install | Non-reproducible | Non-reproducible | Chrome terms, user install | No bundle | Medium | External state risk | INVESTIGATE optional only |

## Selected Candidate

Selected: Playwright Core with an explicit Chromium runtime resolver.

Rationale:

- Best fidelity for HTML/CSS/table/flex/grid/SVG/Unicode without building a renderer.
- `playwright-core` does not download browsers during install.
- Runtime discovery is explicit: `ANCLORA_FILESTUDIO_CHROMIUM_PATH`, future `tools/chromium`, then Playwright cache for local Linux E2E.
- No dependency on personal Chrome as core behavior.
- Security defaults are implementable in code: JavaScript disabled, network blocked, local asset containment, temp profile cleanup and timeout.

## Candidate Details

### Playwright Core + Chromium

NAME: Playwright Core + locked Chromium runtime
TYPE: Node browser automation library plus external browser runtime
RUNTIME: Chromium/Chrome for Testing
HTML/CSS SUPPORT: high
FONTS: system and local assets when allowed
IMAGES: local/data URLs supported, remote blocked
SVG: native Chromium support
TABLES: high
FLEXBOX: high
GRID: high
LOCAL ASSETS: allowed only under input directory
DATA URLS: allowed
REMOTE ASSETS: blocked by default
UNICODE: high
TRANSPARENCY: PNG alpha supported by renderer; white default document background
PNG SUPPORT: native screenshot
TIFF SUPPORT: via PNG buffer to Sharp TIFF/LZW
WINDOWS SUPPORT: planned via locked `tools/chromium`
LINUX SUPPORT: passed E2E
WEB SUPPORT: no, desktop-only
HEADLESS: yes
OFFLINE: yes after runtime exists
LICENSE: `playwright-core` Apache-2.0; Chromium notices required for bundled browser
COMMERCIAL USE: acceptable subject to Chromium notices/SBOM
REDISTRIBUTION: acceptable only with browser notices and locked binary manifest
BUNDLE SIZE: `playwright-core` 14 MB; Chromium cache 389 MB observed
INSTALLED SIZE: 14 MB JS plus browser runtime
DOWNLOAD SIZE: browser archive not downloaded in this phase
STARTUP COST: medium
MEMORY COST: medium
MAINTENANCE STATUS: active
RELEASE RECENCY: Playwright 1.62.1 present in repo lock
SECURITY SURFACE: browser sandbox plus HTML parser/rendering surface
PACKAGING COMPLEXITY: medium/high due browser runtime
EXPECTED QUALITY: high visual fidelity
DECISION: ADOPT

### Raw Chromium CLI

DECISION: REJECT. Quality is equivalent, but process lifecycle, request blocking, profile isolation, diagnostics and timeout handling would be custom and easier to get wrong.

### Puppeteer / Puppeteer Core

DECISION: REJECT. Comparable Chromium quality, but FileStudio already uses Playwright for QA and `playwright-core` gives equivalent control without adding a second browser automation stack.

### Browser-wrapper HTML-to-image libraries

DECISION: REJECT. They wrap Puppeteer or depend on an existing DOM/canvas environment, add extra abstraction, and do not reduce browser runtime size.

### `wkhtmltoimage`

DECISION: REJECT. It is smaller and headless, but modern CSS/grid/flex fidelity and maintenance status are not acceptable for a high-fidelity renderer primitive.

### System Chrome

DECISION: INVESTIGATE optional fallback only. It is not reproducible enough for core Desktop behavior and must never use a user profile.

