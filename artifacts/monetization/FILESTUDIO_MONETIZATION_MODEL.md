# FileStudio Monetization Model

**Phase:** MONETIZATION & EXECUTION COST MODEL (analysis and product design only)
**Date:** 2026-08-13
**Status:** RECOMMENDATION — no payments, no credits, no limits implemented.

Starting questions (per phase principle):

1. **What actually costs FileStudio money?** Distribution, support, development, and — only in a future cloud — compute/egress/storage. Local Desktop conversions have ~zero marginal business cost. Today's Vercel Web runs conversions in the browser, also ~zero marginal cost.
2. **What does the user value enough to pay for?** Volume (batch), automation, speed/priority, advanced workflows (OCR at scale, large video), cloud convenience (no install, anywhere), API access, team/business features. Not basic format conversion — that is a commodity (HandBrake, Calibre: free, unlimited).

## 1. Commercial models evaluated

| Model | User friction | Revenue potential | Cost alignment | Local-first fit | Implementation complexity | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A. Free Desktop + limited/premium Web | Low | Medium | Good | Good | Medium | Strong component |
| B. Free core + premium advanced tools | Low | Medium | Good (value-based) | Excellent | Low-Medium | Strong component |
| C. Free daily limit + credits | High (microbilling perception) | Medium | Excellent (cloud) | Poor for local | High (wallet, expiry, UX) | Rejected for Desktop; limited future use cloud-only |
| D. Subscription (Free/Pro/Business) | Medium | High (recurring) | Medium | Weak for pure-local value | High (billing, entitlements, auth) | Partial — not for v1; candidate for Business/cloud later |
| E. Pay-per-use | High | Low-Medium | Excellent | Poor | High | Rejected for end users; viable for API |
| F. Hybrid: free local desktop + paid cloud/web | Low | Medium-High | Excellent | Excellent | Medium | **Recommended core** |
| G. One-time Desktop license + optional cloud credits | Low | Medium | Good | Excellent | Low-Medium (offline license) | **Recommended Desktop Pro mechanism** |

**Recommended commercial model: F + G** — free local core forever; one-time Pro license for Desktop power features; paid cloud/API later once real cloud costs are measured. Confidence: HIGH for the structure, MEDIUM for price levels (no cost/market evidence yet).

Rationale:

- Matches the cost reality: local marginal cost ~0 -> free local core is sustainable, not charity.
- Matches the market: conversion is a commodity; paywalling basics loses to HandBrake/Calibre/free web tools.
- Matches local-first positioning: "files stay on your device" is a trust differentiator that *increases* Pro value, and an aggressive paywall would destroy it.
- Monetizes where cost and value actually appear: cloud compute, volume, automation, API.

## 2. Plans (2-3 max, API separate)

### Free (Core)

- All local conversions, all 476 effective pairs, best technical route always.
- Batch: basic (e.g. current batch with default concurrency 2).
- Local job history (short TTL, as today).
- Browser Web tools (already client-side, free forever).
- Optional runtime packs (Chromium) — installing a pack is never paywalled per se.
- No account required for local use.
- Must feel like a complete product, never a broken demo.

### Pro (Desktop, one-time license — candidate range only)

- Advanced batch: queues, presets, watch folders, higher concurrency.
- Automation: CLI integration, repeatable workflows.
- Advanced OCR workflows (batch OCR, language packs management) — local basic OCR stays free.
- Large-workflow features: bigger inputs, long video queueing.
- Persistent/extended local history and workflow presets.
- Priority updates / early features.
- Candidate price range: **EUR 29-59 one-time** (LOW confidence — needs market validation; reference: commodity utilities land in this band).

### Business (future, only with clear differentiation)

- Teams, centralized policy, deployment tooling (MSI/Intune-style), priority support.
- Larger cloud quotas if cloud exists.
- Subscription is acceptable here (recurring value: support, fleet management).

### API (separate pricing, future)

- Usage-based (per job/minute) — the only surface where pay-per-use fits naturally.
- Consumers like Nexus (`packages/integrations/anclora-nexus`) are the design reference.
- Internal ecosystem consumers may have separate terms — out of scope here.

## 3. Mechanism verdicts

- **Credits: LIMITED USE.** Good cost alignment for cloud/API; bad friction and microbilling perception for end users. If ever used: cloud-only, shown before execution ("uses N cloud credits"), no aggressive expiry, no credits for local Desktop.
- **Subscription: PARTIAL.** Not for v1. Reconsider only for Business and/or cloud convenience tier once recurring value exists.
- **One-time license: RECOMMENDED** for Desktop Pro. Fits local-first, offline-friendly, simple, no dark patterns.
- **Free local processing: YES.** Charging per local conversion would monetize the user's own CPU — unjustifiable.
- **Paid cloud processing: FUTURE.** Yes when cloud exists and costs are measured.

## 4. Offline licensing (design sketch, not implemented)

- Signed license key (offline-verifiable, e.g. asymmetric signature over email+product+expiry=never).
- Graceful: no phone-home required for core Pro features; optional online activation for convenience.
- No aggressive DRM, no feature kill-switch, no re-validation that can strand a paid user offline.
- Worst case on verification failure: degrade politely to Free, never corrupt workflows.

## 5. Policy layer (future API, not implemented)

```ts
evaluateProductPolicy({ userPlan, route, sourceAnalysis, executionCost })
// -> { allowed: boolean;
//      limit?: { kind: "fileSize"|"batchCount"|"cloudJobsPerMonth"|"ocrPages"|"videoDuration", value: number };
//      upgradeSuggested?: "pro"|"business"|"cloud-credits";
//      creditsRequired?: number }   // cloud only
```

Rules:

- Lives **outside** core routing; consumes the selected route, never modifies it.
- If a conversion is available in a plan, it always uses the best technical route.
- Limits are on size/volume/cloud — never on quality.
- Estimation unavailable on local Desktop -> never block the job.
- Cloud large jobs may require preflight (size/duration/concurrency/rate limits) — abuse protection, Section 62.

## 6. Abuse / cost protection (Web/cloud future)

- File size limits, video duration limits, pages-per-OCR limits, concurrency caps, sliding-window rate limits (Service API already has Redis sliding-window middleware as reference: `apps/api/src/middleware/rate-limit.ts`).
- Existing local config already defines the vocabulary: `MAX_FILE_SIZE_BYTES=2GB`, `MAX_VIDEO_DURATION_SECONDS=7200`, `MAX_CONCURRENT_JOBS=2`, rate-limit env vars (config-only today, no enforcement in `src/app`).
- Desktop abuse: not a primary problem (user's own resources).

## 7. Free cloud quota (future)

- Prefer a **small monthly quota** over daily limits: less frustrating, matches competitors' reset model while feeling fairer, simpler to communicate.
- Candidate: enough for occasional cloud convenience (e.g. a handful of medium jobs/month). Fix only after cost measurement.

## 8. Price communication & UX rules

- No dark patterns: no fake urgency, no hidden limits, no surprise charges, no forced account for basic local use, no quality degradation.
- Users never see "CPU cost 0.38". At most: "this job uses cloud credits" / "requires Pro for batch over N files" — before execution.
- Runtime pack installation stays a technical UX flow, fully separate from monetization.
- Local vs cloud labeling ("process on this device" / "process in the cloud") only if cloud ships; keep unambiguous.

## 9. Release / monetization decision

**Decision gate: RELEASE FREE FIRST.** Monetization before first release: **NO** (partial at most: license plumbing design only).

Justification:

- No productive cloud -> cloud cost UNKNOWN -> any usage-based price would be invented.
- No payment/entitlement infrastructure exists; building it now delays release for unvalidated revenue.
- Product learning first: which conversions, sizes, engines users actually use (local, consented telemetry) -> then fix prices with evidence.
- Free v1 builds the trust/local-first brand that Pro later monetizes.
- Risk of releasing free first: user expectation of "everything free forever". Mitigation: Pro feature set must be *additive* (batch, automation, workflows), never removing existing free capability. Explicit public commitment: current free core stays free.

MVP monetization (when it happens, not v1): (1) offline Pro license check, (2) entitlement gate on the additive Pro features only, (3) simple purchase flow. No credits, no subscription, no cloud billing in MVP.
