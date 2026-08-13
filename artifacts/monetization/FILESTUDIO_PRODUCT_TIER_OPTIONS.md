# FileStudio Product Tier Options

**Phase:** MONETIZATION & EXECUTION COST MODEL — Date: 2026-08-13 — PROPOSAL ONLY, not implemented.

## 1. Packaging model (evaluated, not implemented)

| Product | Surface | Role |
| --- | --- | --- |
| FileStudio Desktop (Free Core) | Local app | Complete local-first converter. Free forever. |
| FileStudio Web | Vercel browser tools | Free browser-only utilities. |
| FileStudio Pro | Desktop license | One-time license, additive power features. |
| FileStudio Business | Future | Teams, policy, support, cloud quotas. |
| FileStudio API | `apps/api` surface | Usage-based, separate pricing. |

## 2. User segments

| Segment | Job to be done | Willingness to pay |
| --- | --- | --- |
| Casual | Occasional single conversion (PDF->DOCX, image resize) | ~0 — served by Free, acquisition channel |
| Power user | Regular conversions, batch, media work | Moderate — Pro candidate |
| Professional | Client deliverables, repeatable workflows, OCR at volume | High — Pro core buyer |
| Business | Fleet deployment, policy, support, compliance | High — Business, future |
| Developer/API user | Programmatic conversion in own product | Usage-based — API, future |

Monetize by value (volume, automation, speed, batch, OCR at scale, cloud, API, workflow), never by format.

## 3. Feature entitlement matrix (proposal)

| Feature | FREE | PRO | BUSINESS | Rationale |
| --- | --- | --- | --- | --- |
| All local conversions (476 pairs), best route | Yes | Yes | Yes | Core value; commodity; cost ~0 |
| Browser Web tools | Yes | Yes | Yes | Client-side, ~0 cost |
| Optional runtime packs (Chromium install) | Yes | Yes | Yes | Pack install is never the paid thing; premium justification must be independent |
| Basic batch (current defaults) | Yes | Yes | Yes | Exists today, feels complete |
| Advanced batch (queues, presets, high concurrency) | — | Yes | Yes | Volume = value |
| Watch folders / automation | — | Yes | Yes | Automation = value |
| CLI integration | — | Yes | Yes | Professional workflow |
| Local basic OCR (within current caps) | Yes | Yes | Yes | Avoid paywalling a working local feature |
| Advanced OCR (batch, multi-language at scale) | — | Yes | Yes | Complexity + volume value |
| Large workflow features (very large inputs, long video queues) | Limited (today's 2 GB / 7200 s caps) | Higher caps | Higher caps | UX protection, not quality |
| Local short history | Yes | Yes | Yes | Existing behavior |
| Extended/persistent local history + workflow presets | — | Yes | Yes | Convenience value, zero marginal cost |
| Priority updates / early features | — | Yes | Yes | Classic license perk |
| Cloud processing (future) | Small monthly quota | Larger quota | Largest + priority | Real cost driver — the legitimate metered thing |
| Cloud persistent history/sync (future) | — | Optional | Yes | Server storage cost |
| API access (future) | — | — | Usage-based | Developer segment |
| Team management / centralized policy / fleet deployment | — | — | Yes | Business value |
| Priority support | — | — | Yes | Recurring value, justifies subscription |

## 4. Explicit lists

### What should remain FREE

- Every local conversion pair and every engine available today, at full quality.
- Basic batch, local short history, browser Web tools.
- Runtime pack downloads/install (distribution cost is not a per-use justification).
- Local basic OCR within existing caps.
- No-account local usage.

### What MAY be premium (Pro)

- Advanced batch, watch folders, automation, CLI.
- Advanced OCR workflows at scale.
- Extended history, workflow presets.
- Higher size/duration caps.
- Priority updates.

### What SHOULD be usage-based

- Cloud processing (compute/egress/storage) — when it exists.
- API access.
- Possibly cloud storage/sync beyond a small quota.

### Business candidates

- Team seats, centralized policy, fleet deployment tooling, priority support, larger cloud quotas.

### What should NOT be monetized

- Basic format conversion itself (commodity; HandBrake/Calibre set the floor).
- Quality of route (never a quality paywall).
- Chromium/runtime pack installation per se.
- The user's own CPU/RAM (local heavy conversions: video, OCR — cost to FileStudio ~0).
- Failed jobs, fallback retries, invalid-input rejections.
- Privacy: "files stay on your device" is not an upsell tier, it is the brand.

## 5. Per-feature value analysis

| Premium feature | User value | Cost to FileStudio | Differentiation | Expected demand | Confidence |
| --- | --- | --- | --- | --- | --- |
| Advanced batch/presets | High (time saved) | ~0 (local) | Medium (HandBrake has queues) | High | HIGH |
| Watch folders/automation/CLI | High | ~0 | Medium-High | Medium-High | HIGH |
| Advanced OCR workflows | High (pro use) | ~0 local | Medium | Medium | MEDIUM |
| Extended history/presets | Medium | ~0 | Low-Medium | Medium | MEDIUM |
| Higher size/duration caps | Medium | ~0 local | Low | Medium | MEDIUM |
| Cloud processing | Medium-High (convenience) | REAL (compute/egress) | Low (commoditized) | Unknown until shipped | LOW (pre-measurement) |
| API | High (developers) | Real (service infra) | Medium | Unknown | LOW-MEDIUM |

## 6. Privacy / trust positioning

- "Files stay on your device" + offline-capable + no upload required = the commercial differentiator vs CloudConvert/Convertio/Adobe online.
- No account for basic local use. Optional free account only if sync/cloud ships.
- This positioning raises Pro conversion (trust brand) and forbids dark patterns by coherence.

## 7. Competitive position (see pricing decision matrix for sources)

- Online converters monetize upload-based cloud conversion with credits/minutes and file-size limits — exactly the model FileStudio Desktop makes unnecessary locally.
- Free desktop tools (HandBrake, Calibre) are single-domain; FileStudio's breadth (476 pairs, quality-aware routing, observability) is the differentiator.
- Position: "the private, local-first universal converter" — Pro sells time (batch/automation), not conversion.
