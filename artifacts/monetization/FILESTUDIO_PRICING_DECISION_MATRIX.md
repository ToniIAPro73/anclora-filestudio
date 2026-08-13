# FileStudio Pricing Decision Matrix

**Phase:** MONETIZATION & EXECUTION COST MODEL — Date: 2026-08-13 — DECISION ARTIFACT.

## 1. Decision gate

| Question | Answer | Confidence |
| --- | --- | --- |
| Implement monetization before first release? | **NO** — release free first | HIGH |
| Recommended commercial model | **F + G hybrid**: free local core + one-time Pro license (Desktop) + paid cloud/API later | HIGH (structure) / MEDIUM (price levels) |
| Credits | **LIMITED USE** — future cloud/API only, never local Desktop | HIGH |
| Subscription | **PARTIAL** — not v1; reconsider for Business/cloud convenience later | MEDIUM |
| One-time license | **RECOMMENDED** for Desktop Pro | HIGH |
| Free local processing | **YES** | HIGH |
| Paid cloud processing | **FUTURE** — yes, after cost measurement | HIGH |
| Quality paywall | **NO** (hard rule) | HIGH |
| Routing impact | **NONE** | HIGH |

## 2. Model comparison matrix

| Model | User friction | Revenue potential | Cost alignment | Local-first fit | Impl. complexity | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| A. Free Desktop / premium Web | Low | Medium | Good | Good | Medium | Component of F |
| B. Free core + premium tools | Low | Medium | Good | Excellent | Low-Med | Component of F/G |
| C. Daily limit + credits | High | Medium | Excellent (cloud) | Poor | High | Cloud-only, later |
| D. Subscription | Medium | High | Medium | Weak | High | Business/future only |
| E. Pay-per-use | High | Low-Med | Excellent | Poor | High | API only |
| **F. Hybrid free local + paid cloud** | **Low** | **Med-High** | **Excellent** | **Excellent** | **Medium** | **RECOMMENDED** |
| **G. One-time license + cloud credits** | **Low** | **Medium** | **Good** | **Excellent** | **Low-Med** | **RECOMMENDED (Desktop Pro)** |

## 3. Market research — SOURCE DATA (accessed 2026-08-13, official sources)

| Product | Model | Free limits | Paid price | URL |
| --- | --- | --- | --- | --- |
| CloudConvert | Credits (~1/min conversion; base 1-4 by type). Package (no expiry) + Subscription | 10 credits/day, 1 GB/file, 5 min processing, 5 concurrent | Subscription from $10/mo (1,000 credits) | cloudconvert.com/pricing |
| Convertio | Subscription + conversion credits | ~100 MB/file, ~10 min/day (snippet-sourced, not verified on official page) | $11.99/mo ($6.99 annual); tiers to $54+/mo | convertio.co/pricing/ |
| Online-Convert | Credits (1 = ~30 s). PAYG (1-yr expiry) + subscription | Renewing trial credits; 100 MB/file (help page) | PAYG EUR 13/480 credits; EUR 22.42/mo/2,800; EUR 68/mo/10,000 | online-convert.com/pricing |
| Adobe Acrobat online | Freemium tools + Acrobat subscription | 25+ online tools "try for free", heavy use requires subscription | Not verified (JS-only pricing page) | adobe.com/acrobat/online.html |
| HandBrake | Free, open source, donations | Unlimited | $0 | handbrake.fr |
| Calibre | Free, open source, donations | Unlimited | $0 | calibre-ebook.com/about |

Observations (source data, not recommendation):

- Dominant SaaS unit = processing-time credits, not per-file.
- Entry paid tier converges at ~$10-13/month; annual discounts 20-40%.
- Tier levers: max file size, concurrency, queue priority.
- Free desktop tools set the commodity floor at $0 unlimited.

## 4. FILESTUDIO RECOMMENDATION (separated from source data)

- Do not copy the credits model to Desktop. It exists in competitors because their compute is real and per-job; FileStudio Desktop compute is the user's.
- If cloud ships, a small monthly free quota + usage-based overage is the cost-aligned pattern proven by the market; fix numbers only after measuring real duration/memory/egress via existing observability + `apps/api` metrics.
- Pro one-time candidate range EUR 29-59 (LOW confidence, validate). Business/API: design later.
- Max 2-3 plans + separate API pricing.

## 5. Uncertainty register

| Item | Certainty | Note |
| --- | --- | --- |
| Cloud per-job cost | UNKNOWN | No productive cloud infra. Measure first. |
| Price levels | LOW | Candidate ranges only; needs market/cost evidence. |
| Pro feature demand | MEDIUM | Validate via consented local usage learning post-release. |
| Structure of model (F+G) | HIGH | Follows directly from cost reality + market floor. |

## 6. Risks

- **Expectation risk**: releasing free first may anchor "all free forever" — mitigate with additive-only Pro and public commitment that current free core stays free.
- **License abuse**: offline keys can be shared — accept (no aggressive DRM); revenue impact small at this scale.
- **Scope creep**: cloud/API work could start before costs are measured — gate it behind the cost observation plan.
- **Docs inconsistency**: FFmpeg license stated as GPL-2.0-or-later in `docs/toolchain.md` / `scripts/toolchain.lock.json` but LGPL-2.1+ in `docs/third-party-licenses.md` — unify before distribution of any paid artifact (legal hygiene, not a monetization blocker).

## 7. Recommended next phase

1. RELEASE HARDENING (product is ready: 0 P0/P1, routing PASS, observability PASS).
2. Release v1 free; add opt-in local usage learning (no content, no external telemetry without separate decision).
3. Cost observation sprint: join `inputs.attributes_json` to job execution metadata; optional dev benchmark harness for CPU/RAM bands per engine.
4. Monetization design freeze: Pro license plumbing + entitlement gate design (implementation is a separate authorized phase).
5. Cloud cost measurement before any cloud/API pricing.
