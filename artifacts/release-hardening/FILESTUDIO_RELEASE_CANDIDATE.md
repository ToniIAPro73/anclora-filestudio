# FileStudio Release Candidate

VERSION: 0.2.0
DATE: 2026-08-13

The previous Windows native QA candidate is invalidated.

Observed audited candidate:

- embedded SHA: 375701c
- expected later candidate source: 0a01bb4 before this remediation
- result: WINDOWS NATIVE QA FAIL
- recommendation: NOT READY

This remediation updates UI navigation, capability selectors, image route
ranking, runtime pack consent/provenance, portable state exclusion, JSON BOM
handling, diagnostics status, small-file sizing and portable verification gates.

Final rebuilt artifact hashes are intentionally not recorded here before the
candidate is rebuilt from a committed source state. The final handoff must
report:

- NEW_RC_SHA
- NEW_WINDOWS_SHA256
- NEW_LINUX_SHA256

## BASELINE REQUIREMENTS

- lint: PASS, 0 warnings
- typecheck: PASS
- tests: PASS
- build: PASS, 0 NFT/Turbopack warnings
- linux portable build/verify/smoke: PASS
- windows portable build/verify: PASS

## RELEASE STATUS

PENDING WINDOWS NATIVE RETEST
