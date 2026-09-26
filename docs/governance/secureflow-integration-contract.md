# SecureFlow Integration Contract — Anclora FileStudio

Status: implemented (classification + local metadata), catalog wiring pending in `anclora-secureflow`.
Date: 2026-09-26.

## Context

FileStudio was reclassified from the `Interna` governance tier to `MicroSaaS`, as the first
product (capability **Prepare**) of the commercial SaaS family **Anclora SecureFlow**:

```text
Anclora SecureFlow
├── Anclora FileStudio   — Prepare
├── Anclora PurgeDoc     — Protect
├── Anclora TableExtract — Extract
└── Anclora CleanSheet   — Automate
```

This does not introduce a new governance tier. `SecureFlow` is a commercial/marketing grouping
inside the existing `MicroSaaS` tier already used by PurgeDoc, TableExtract, and CleanSheet. See:

- `anclora-vault/00-governance/registry/ecosystem-repos.json` — FileStudio entry: `family`/`tier`
  changed from `internal` to `microsaas`; `ecosystem_clusters` now includes `microsaas` and
  `secureflow`.
- `anclora-group/contracts/core/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md` — FileStudio moved from
  "Aplicaciones internas" to "Aplicaciones MicroSaaS", with a new "Familia comercial Anclora
  SecureFlow" note and an updated row in the app-assignment table.
- `anclora-group-landing/docs/standards/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md` — propagated copy of
  the above, kept in sync.

No other repository's classification was changed. `anclora-content-generator-ai` and
`anclora-talent` remain exactly as they were (not part of SecureFlow).

## Where the real commercial catalog lives

The catalog and whitelist that customers/checkout actually consume are **not** in this
repository. They live in `anclora-secureflow`:

- `src/data/products.ts` — product list (`id`, `name`, `category`, `description`, `logo`, `url`).
  FileStudio was already present here (`id: 'filestudio'`, `category: 'Prepare'`) before this
  change; the entry now also carries the fields below.
- `src/data/plans.ts` — sellable plan/pack values (`filestudio`, `pack-2`, `pack-3`, `complete`, …).
- `src/services/accessRequestService.ts` — access-request/whitelist boundary. It is currently a
  stub (`submitAccessRequest` returns `{ persisted: false }` and does not call any real API or
  whitelist yet). **Wiring FileStudio into a real, persisted SecureFlow whitelist/permission
  system is not done and is out of scope for this repository** — it requires backend work inside
  `anclora-secureflow` (or a shared service) that does not exist yet.

## Local integration contract (this repository)

Because the live catalog is owned by another repository, FileStudio documents its own commercial
identity as a local, read-only contract rather than inventing a fake registration mechanism:

```ts
// src/lib/filestudio-brand.ts — FILESTUDIO_BRAND.secureFlow
{
  family: "Anclora SecureFlow",
  capability: "Prepare",
  tagline: "Prepara, convierte y organiza tus archivos para que el resto del flujo Anclora SecureFlow pueda protegerlos, extraer su información o automatizarlos.",
  taglineEn: "Prepares, converts, and organizes your files so the rest of the Anclora SecureFlow workflow can protect, extract, or automate them.",
}
```

Mapped to the catalog shape requested for cross-ecosystem registration:

```ts
{
  id: "filestudio",
  name: "Anclora FileStudio",
  tier: "saas",       // governance tier: "microsaas" (see ecosystem-repos.json / ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md)
  capability: "prepare",
  secureFlow: true,
  standalone: true,
  availableInPacks: true,
}
```

This object is **not** wired into any runtime registration call — no such extensible catalog
registration API exists in this repository or in `anclora-secureflow` today (the latter's
`products.ts`/`plans.ts` are static data arrays, not a plugin/registry system). Any future work to
make this a live, importable contract (e.g. a shared `@anclora/secureflow-catalog` package
consumed by both repos) is a new cross-repo architecture decision, not something this repository
can introduce unilaterally.

## Visual identity (CHG-0018, 2026-09-26)

FileStudio's commercial classification changed to MicroSaaS/SecureFlow, but its logo/favicon
assets initially stayed on the old `Internal` tier mark. Fixed in CHG-0018: FileStudio now uses
the canonical **SaaS tier** logo master (`anclora-design-system/assets/logos/tiers/anclora-saas-tier.png`),
the same lockup already used by PurgeDoc, TableExtract, and CleanSheet (same geometry, tier-level
color treatment only). Regenerated in this repo: `public/brand/anclora-filestudio.{png,webp}`,
`public/favicon.ico`, `public/favicon-32.png`, `public/favicon-512.png`, `public/icon.png`,
`public/apple-touch-icon.png`, `src/app/icon.png`, `src/app/apple-icon.png`. Filenames are
unchanged (per the tier-logo system's naming rule); `src/lib/branding/icon-metadata.ts` hashes
file content for cache-busting, so no code change was needed. Previous (Internal-tier) assets are
kept, not deleted, under `public/brand/legacy/*-internal-tier-2026-09-26.*`. FileStudio's own UI
accent color (`#14b8a6`, `src/lib/filestudio-brand.ts`) is unchanged — the tier logo palette and
each app's own UI accent are independent per `anclora-design-system/assets/logos/tiers/README.md`.

## Pending items / follow-ups for `anclora-secureflow`

1. Extend `Product` in `src/data/products.ts` with `tier`, `capability`, `secureFlow`,
   `standalone`, `availableInPacks` fields (mirrored across all four products, not just
   FileStudio) so the catalog matches the contract above. See this repo's PR/commit for the
   FileStudio-side half of this change.
2. Replace the placeholder logo currently shared (byte-identical) across PurgeDoc, TableExtract,
   and CleanSheet with distinct artwork — FileStudio's own logo is already distinct and does not
   need replacement.
3. Implement real persistence/whitelist behind `accessRequestService.ts` before treating SecureFlow
   access requests as functional.

## Governance note

`docs/governance/decision-expose-filestudio-as-product-infra.md` (still pending, unrelated topic:
exposing the Service API as internal product infrastructure for Nexus/Talent) is not resolved or
affected by this change. This SecureFlow reclassification is a separate, narrower decision: it
changes FileStudio's *commercial/marketing* tier, not its Service API exposure model.
