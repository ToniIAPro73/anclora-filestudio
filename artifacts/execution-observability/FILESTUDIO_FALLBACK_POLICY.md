# FileStudio Controlled Fallback Policy

Generated: 2026-08-13

## Default

Controlled fallback is enabled after certification for ranked multistep/canonical route jobs.

Scope:

- Applies to canonical route jobs handled by `processMultistepJob`.
- Does not alter discovery, capabilities, route scores, tiers or `MAX_INTERMEDIATES`.
- Does not apply to legacy media jobs in this phase.
- Does not bypass optional runtime pack installation.

## Attempt Limit

Maximum route attempts: primary + 1 fallback.

No retry storm is implemented. Retrying the same route is out of scope.

## Quality Floor

Fallback candidate must satisfy both:

- `candidate.score >= 0.55`
- `primary.score - candidate.score <= 0.18`

The floor was chosen after auditing the current score distribution. It keeps fallback in the practical acceptable band and blocks weak degraded alternatives. The audit found 412 pairs with multiple ranked routes, but only 6 pass quality and failure-domain constraints for an injected primary timeout.

## Failure Domain

The policy rejects a fallback route when it uses the same failed engine. Runtime pack domain support is modeled, and `RUNTIME_PACK_BROKEN` remains disabled by default until an equivalent safe route exists and policy explicitly allows it.

## Eligible Failures

Eligible by default:

- ENGINE_START_FAILED
- ENGINE_CRASH
- ENGINE_TIMEOUT
- TEMPORARY_IO_ERROR
- OUTPUT_WRITE_ERROR
- PROCESS_EXIT_NONZERO

Not eligible:

- INVALID_SOURCE
- SOURCE_MISMATCH
- CORRUPT_INPUT
- UNSUPPORTED_CONTENT
- QUALITY_GUARD_FAILED
- SCANNED_CONTENT_REQUIRES_OCR
- SECURITY_POLICY_BLOCKED
- RUNTIME_PACK_REQUIRED
- USER_CANCELLED
- UNKNOWN

## Selection

Fallback selection uses the next ranked eligible route from the server-side ranked route list. It does not recalculate quality or create routes.

Reason codes:

- PRIMARY_ENGINE_TIMEOUT
- PRIMARY_ENGINE_CRASH
- PRIMARY_PROCESS_EXIT_NONZERO
- PRIMARY_TEMPORARY_IO_ERROR
- PRIMARY_OUTPUT_WRITE_ERROR
- ALTERNATIVE_ENGINE_AVAILABLE
- QUALITY_FLOOR_MET
- FAILURE_DOMAIN_AVOIDED

## Audit Summary

- Pairs with at least two ranked routes: 412
- Fallback possible under current policy: 6
- No safe fallback under current policy: 406

This is intentional. Fallback is best-effort, not a coverage claim.
