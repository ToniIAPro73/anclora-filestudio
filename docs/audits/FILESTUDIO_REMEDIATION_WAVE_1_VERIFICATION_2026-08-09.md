# FileStudio Remediation Wave 1 — Independent Verification

**Repository audited:** `~/workspace/anclora/anclora-filestudio`
**Date:** 2026-08-09
**Method:** independent read-only review (git diff/log/status, live re-run of `pnpm lint/typecheck/test/build/audit/test:e2e`, static inspection of scripts and docs, cross-check against `anclora-knowledge` AOS sources and sibling adopted repos). No files modified, no packages installed, no commits, no branch changes, no changes to Bóveda/AOS/VPS/Vercel.

Reference documents: `AUDITORIA_ANCLORA_FILESTUDIO_2026-08-09.md` (original independent audit), `FILESTUDIO_REMEDIATION_WAVE_1_RESULT.md` (Codex's remediation report).

---

## 1. Executive Summary

Wave 1's diff matches the authorized scope exactly — 8 files changed, none extra, none missing. Forbidden directories (`apps/worker`, `apps/local-agent`, `packages/engines`, `deploy/vps`) are untouched, confirmed via `git diff`. The Bóveda-Anclora and anclora-knowledge repositories are clean and untouched. All regression numbers reproduce an exact match against Codex's report (lint, typecheck, test, build, audit, e2e). One gap was found: the committed `artifacts/acceptance/fixture-manifest.json` is stale (predates the Wave 1 script changes), so the "62 fixtures" claim could only be verified analytically, not by a live re-run (a live re-run would have overwritten this tracked file, which would violate the read-only constraint of this verification). No blocking defect was found.

## 2. Git Baseline Verification

- Branch: `main` ✓
- HEAD: `d3a87399eb66354ee4afadca97960da75a7b2d24` ✓
- Working tree: clean ✓
- Parent: `5a31b6a0c029b7c4e2d985c8ef027f60b5af7c72` ✓

All stated assumptions are TRUE.

## 3. Scope Compliance

Changed files (`git diff --stat 5a31b6a..d3a8739`) match the expected list exactly, 1:1, with zero extras:

`.anclora/AOS_ADOPTION.md`, `.gitignore`, `AGENTS.md`, `docs/qa/FILESTUDIO_QA_STRATEGY.md`, `package.json`, `playwright.config.ts`, `scripts/acceptance/generate-fixtures.mjs`, `tests/e2e/app-smoke.spec.ts`

A forbidden-paths check (`apps/worker`, `apps/local-agent`, `packages/engines`, `deploy`) against the same diff range returned empty — confirmed clean. Bóveda-Anclora and anclora-knowledge repos both report a clean `git status --porcelain`, confirming neither was touched.

## 4. F-03 — Playwright Review

`playwright.config.ts` is new and sound: `testDir: "./tests/e2e"`, CI-aware retries/workers/reporter, `trace`/`screenshot`/`video` set to `on-failure` (reasonable, not excessive), `webServer` spawns `corepack pnpm@10.33.2 dev` against port 3000, matching the `baseURL` default (`http://localhost:3000`) — coherent. `reuseExistingServer: !CI` follows the standard Playwright pattern.

The smoke test (`tests/e2e/app-smoke.spec.ts`) navigates to `/`, asserts the page title matches `/Anclora FileStudio/i`, and asserts a visible heading matching `/FileStudio/i`. This is not a trivially-passing test — a live run in this verification confirmed the dev server actually boots, the page actually renders, and the assertions run against real DOM content (see §10). It proves the application is reachable, which is sufficient for Wave 1's goal of "trustworthy QA infrastructure," not a full E2E suite, as explicitly scoped.

**Verdict: solid, no finding.**

## 5. F-04 — QA Corpus Review

The script diff adds: `schemaVersion: 2`, a `qaModel` metadata block, a `coverage` summary, a `sha256` hash per fixture, and 5 new edge-case fixtures (`edge-empty.txt`, `edge-malformed.json`, `edge-malformed.xml`, `edge-corrupt.pdf`, `edge-nested.zip`).

**Fixture-readiness vs. functional-conversion-coverage — the distinction requested for this review:**

- "62 fixtures generated" means format/sample readiness only. It does **not** mean 62 conversion paths were validated — this script does not invoke any conversion engine or check output correctness. `test:acceptance:api` (a separate script) would exercise actual conversions; that step was not run in this verification.
- Arithmetic check: the previously committed manifest (stale — see Finding NF-1) shows `fixtureCount: 57`. The script diff adds exactly 5 new edge-case fixtures. 57 + 5 = 62, matching Codex's claim analytically. This was not independently re-executed live, because doing so would have overwritten a tracked file (see NF-1 and §10).

Format families covered: image (Sharp), audio/video (FFmpeg, conditional on binary presence), document (zip-based OOXML/ODF plus optional python-pptx regeneration and optional LibreOffice regeneration), PDF (hand-built plus the new corrupt/truncated edge case), archive (zip/tar/gz/bz2/xz/7z, conditional on binaries, plus the new nested-zip edge case), and data (json/yaml/xml/csv/etc., plus new malformed json/xml edge cases). Complexity tiers (simple/medium/complex/malformed) are present via a new `complexityFor()` heuristic — reasonable but not exhaustive (see NF-4).

Hashes: sha256 was added, but it is reproducible only for pure-JS/text fixtures. FFmpeg/7z/LibreOffice/python-generated outputs are deterministic per exact toolchain version, not guaranteed byte-identical across machines with different FFmpeg/LibreOffice/python versions. The QA strategy doc calls the corpus "deterministic" without that caveat (see NF-3, minor).

Archive fixtures are safe: `edge-nested.zip` is small, benign, two levels of nesting — no zip bomb, no path-traversal payload. The malformed fixtures (empty txt, broken json/xml, truncated pdf) are inert text/byte content with no injection or exploit risk.

python-pptx absence is handled honestly: this was reproduced live in the verification environment — `ModuleNotFoundError: No module named 'pptx'`. The script's `createPptxWithPython` path catches the failure, logs a `console.warn`, keeps the prior zip-based pptx fixture, and does not crash the pipeline or silently claim success. This is the correct honest-degrade behavior.

The generated fixtures directory (`tests/acceptance/fixtures/generated/`) is correctly gitignored (a pre-existing rule, unchanged). The new `.gitignore` line adds `/artifacts/playwright/`, correctly scoped to F-03's output.

**NF-1 flagged here** (full detail in §12).

## 6. F-05 — pnpm Review

The diff removes the dead `"pnpm": { "overrides": {...} }` block entirely and keeps the top-level `"overrides"` (`postcss ^8.5.18`, `sharp ^0.35.1`) unchanged. `pnpm-lock.yaml` shows zero diff, confirmed via `git diff --stat`. No dependency version was bumped, and no unintended lockfile drift occurred. This is the correct fix for pnpm 10.33.2 — the original audit's live warning (`"pnpm" field in package.json is no longer read by pnpm`) matches exactly this dead configuration; removing it is the right fix, and nothing else was touched.

**Verdict: clean, no finding.**

## 7. F-08 — AGENTS.md Review

The rewrite (311 → ~198 net lines) replaces a stale single-app phase log with a current AS-IS table covering Vercel Web / Web-Desktop / Service API / Worker / Local Agent / Nexus, each with an explicit "Capability status" column. It correctly states:

- `packages/engines` is a "STUB for incremental engine migration. Do not assume migrated parity" — matches the original audit's finding that the package's own code comment says the same thing.
- Worker "does not yet have full Web/Desktop engine parity" — no false-parity claim.
- Local Agent: "full engine parity is not complete" — same treatment.
- The "Important Boundaries" section explicitly forbids expanding worker/local-agent for parity "unless a separate architectural decision authorizes" that work — directly encoding F-01/F-02 as frozen findings.

History is preserved under "Historical Implementation Notes," clearly labeled as "not the current architecture contract" — a clean separation that matches the instruction to preserve history without presenting it as current architecture.

**Verdict: accurate, matches repository reality. No finding.**

## 8. F-09 — AOS Adoption Review (high attention)

Cross-checked against `anclora-knowledge/standards/AOS_ADOPTION_STANDARD.md` (v0.2, GL-2) and the sibling `anclora-infrastructure/.anclora/AOS_ADOPTION.md` as a reference example of an already-adopted repository.

All required metadata is present: Repository Name, Owner, Adoption Status (`Adopted`), AOS Version (`v0.2.0` — matches `anclora-knowledge/VERSION.md`'s repository version 0.2.0), Adoption Date, Last Reviewed, and Governance Level (`GL-1` — correct per the standard, which classifies "adoption or adoption update in an individual repository" as GL-1). "Repository Owner: AOS Chief Architect" matches the exact convention used in `anclora-infrastructure`'s adopted declaration — not an anomaly, but a consistent ecosystem pattern.

The ED/OD/PD/EX model is stated correctly and matches `D-2026-0008.md`'s classification (file existence and definitions verified). No global rigid hierarchy is imposed — the declaration explicitly frames the engine-parity gap as "a local architectural state, not an AOS exception," consistent with the standard's domain-first conflict-resolution model (no "most conservative wins" language appears anywhere). No `MEMORY.md` exists in this repository, so there is no possibility of it being treated as normative authority.

No invented ED or OD decision was found — a grep across `anclora-knowledge/knowledge/*.md` and `decisions/*.md` for "filestudio" returned zero hits, confirming no fabricated ecosystem decision references FileStudio.

The pending decision (`docs/governance/decision-expose-filestudio-as-product-infra.md`) was confirmed to still have status `"owner decision required"`; the file is untouched by the Wave 1 diff, and `AOS_ADOPTION.md` explicitly states that "this Wave neither approves, rejects, nor modifies it." It was not silently resolved.

**Verdict: compliant, well-formed, consistent with the sibling-repo pattern. No finding.**

## 9. QA Strategy Review

`docs/qa/FILESTUDIO_QA_STRATEGY.md` distinguishes all five required surfaces (Vercel Web, Web/Desktop, Service API/Worker, Local Agent, Portable Windows/Linux). Sections C and D explicitly state that "Current Wave 1 readiness does not assert full engine parity with Web/Desktop" — no untested capability is declared PASS. It honestly reflects the audit's actual capability gaps (F-01/F-02). One minor gap: the document calls the corpus "deterministic" (line 70) without the toolchain-version caveat — see NF-3.

## 10. Regression Validation (live re-run in this verification)

| Command | Codex's claim | This verification (live) | Match |
|---|---|---|---|
| `git diff --check HEAD^` | — | exit 0, clean | ✓ |
| `pnpm lint` | PASS, F-06 warnings | PASS, same 3 `<img>` warnings, same files/lines | ✓ |
| `pnpm typecheck` | PASS | PASS, no output | ✓ |
| `pnpm test` | 752 passed / 1 skipped | 752 passed / 1 skipped (55 files) | ✓ exact |
| `pnpm build` | PASS | PASS (non-blocking NFT trace warning, pre-existing) | ✓ |
| `pnpm audit --prod` | 0 vulnerabilities | "No known vulnerabilities found" | ✓ |
| `pnpm test:e2e` | 1 smoke PASS | 1 passed (chromium, 2.6s) | ✓ exact |
| `pnpm test:acceptance:fixtures` | 62 generated | **SKIPPED** | see NF-1 |

`test:acceptance:fixtures` was skipped because the script unconditionally overwrites the tracked file `artifacts/acceptance/fixture-manifest.json` (`writeJson(path.join(repoRoot, "artifacts/acceptance/fixture-manifest.json"), manifest)`), with no CLI option to redirect that specific write. Running it would have modified a tracked file mid-verification, violating the explicit read-only mandate for this review. It was skipped and the reason documented here. The working tree was confirmed to remain clean (`git status --porcelain` empty) after every other command was run.

## 11. Frozen Findings Verification

F-01, F-02, F-06, F-07, F-10, F-11, and F-12 were confirmed untouched by the diff (no code changes to worker/local-agent, no heartbeat changes, no `<img>` usage changes, no Bóveda changes, no `engines` field changes). F-01 and F-02 are explicitly labeled `ARCHITECTURAL DECISION REQUIRED` in `FILESTUDIO_REMEDIATION_WAVE_1_RESULT.md` and echoed in AGENTS.md's boundaries section — they were not reinterpreted as authorized remediation and were not silently resolved. Correct.

## 12. New Findings

**NF-1** — SEVERITY: LOW — FILE: `artifacts/acceptance/fixture-manifest.json`
EVIDENCE: file is tracked in git (confirmed via `git ls-tree HEAD`), dated 2026-06-19, `fixtureCount: 57`, old schema (no `schemaVersion`, no `qaCategory`/`complexity`/`sha256`/`coverage`). Wave 1 changed the generator script but never regenerated or committed this artifact.
IMPACT: the repository's committed QA artifact is out of sync with the generator that produces it; anyone reading the tracked file sees a stale schema and count. The "62 fixtures" figure in Codex's report is not independently verifiable from repository state alone.
RECOMMENDATION: regenerate and commit an updated manifest in a follow-up, or gitignore it like the rest of `artifacts/acceptance/**`.
BLOCKS_WAVE1_APPROVAL: NO

**NF-2** — SEVERITY: LOW — FILE: `scripts/acceptance/generate-fixtures.mjs`
EVIDENCE: `writeJson(path.join(repoRoot, "artifacts/acceptance/fixture-manifest.json"), manifest)` runs unconditionally regardless of the custom `outDir` argument passed via `process.argv[2]`.
IMPACT: the script cannot be run read-only against an alternate output directory without also dirtying this tracked repository file — this blocked independent live verification in this review (see §10).
RECOMMENDATION: make the repo-root manifest write opt-in, or also honor a custom path override for it.
BLOCKS_WAVE1_APPROVAL: NO

**NF-3** — SEVERITY: INFO — CATEGORY: documentation
EVIDENCE: `docs/qa/FILESTUDIO_QA_STRATEGY.md`, line 70, calls the generated corpus "deterministic" without qualification.
IMPACT: sha256 hashes are reproducible only for pure-JS/text fixtures; FFmpeg/7z/LibreOffice/python-generated fixtures vary by installed toolchain version across machines.
RECOMMENDATION: qualify the claim as "deterministic per fixed toolchain version," or pin toolchain versions for any hash-comparison use case.
BLOCKS_WAVE1_APPROVAL: NO

**NF-4** — SEVERITY: INFO — CATEGORY: qa-coverage (optional improvement)
EVIDENCE: the 5 new edge-case fixtures cover only data (json/xml), text, pdf, and archive-complex categories. No malformed image, audio, video, document, or ebook fixture was added, despite the original audit's proposed corpus matrix (§14 of `AUDITORIA_ANCLORA_FILESTUDIO_2026-08-09.md`) suggesting one malformed sample per format family.
IMPACT: malformed-input QA coverage remains thin outside data/pdf/archive. This is exactly the gap the task instructions warned against conflating with "fixture readiness" — it has been partially, but not fully, narrowed.
RECOMMENDATION: extend the edge-case set to image/audio/video/document/ebook malformed samples in a future wave.
BLOCKS_WAVE1_APPROVAL: NO

No actual defects, no security issues, and no scope violations were found.

## 13. Approval Decision

**WAVE 1 APPROVED WITH NON-BLOCKING FINDINGS**

Scope was respected exactly, all frozen findings stayed frozen, and all regression numbers reproduced live except one skipped for a valid read-only-safety reason (explained above and corroborated analytically). Four low/info findings are noted for future cleanup — none block Wave 1 approval.

No remediation was applied during this verification, per instruction.
