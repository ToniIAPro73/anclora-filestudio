# Audit — FileStudio Web Anti-Abuse, Limits & Data Protection

Status: informational audit, no code changed. Requested as part of the
Anclora Identity Wave 1 pilot scoping (FileStudio Web stays anonymous, no
human login added — this documents what protects it instead).

## Architecture that shapes this audit

Per `docs/security.md`: "La versión Web en Vercel no ejecuta procesos
externos" — all conversion for the Vercel-hosted Web variant runs
client-side, in the visitor's own browser (`canUseLocalFilesystem()` /
`canSpawnExternalTools()` both return `false` for the `vercel` deployment
target, `src/lib/deployment-target.ts`). This materially changes the abuse
surface compared to a server-side processing product: there is no backend
compute cost per anonymous conversion, and no uploaded file content ever
reaches a FileStudio server for the Web variant.

## Findings by area

- **Rate limiting**: none found in the Web/browser code path (`src/`), and
  none is architecturally required for the conversion itself since it runs
  client-side. The only rate limiting in this repository is
  `apps/api/src/middleware/rate-limit.ts` (Redis sliding window per
  `client_id`), which belongs to the separate M2M service API
  (`apps/api`), not the Web tool.
- **Upload limits / quotas**: enforced per-format at the browser engine layer,
  not globally — e.g. `MAX_INPUT_SIZE_BYTES = 50MB` in
  `src/lib/engines/ebook/calibre-engine.ts`, and the resource-limit table in
  `docs/security.md` (50MB ebook size, 50-page OCR cap, 100x decompression
  ratio guard, 10,000-entry archive cap). These guards exist in shared engine
  code; whether every one of them is reachable/enforced from the browser
  bundle specifically (vs. only from the Desktop/Service builds that share
  the same engine modules) was not verified file-by-file in this pass — flag
  for a follow-up code-level check before treating all of them as active in
  the Web bundle.
- **Anti-abuse / bot protection**: no CAPTCHA, no proof-of-work, no
  Vercel-edge bot-management configuration found in the repository. Given the
  client-side processing model this is lower risk than for a server-processing
  product, but it is a real gap for scenarios like automated scraping of the
  tool for a competing service, or a scripted client hammering any Web-side
  API route that does exist (see below).
- **SSRF**: no server-side fetch-on-behalf-of-user surface found in the Web
  variant — SSRF-hardening code (DNS re-resolution checks, private-range
  blocking) exists only in `apps/api/src/services/webhook-delivery.ts`, which
  is the M2M webhook delivery path, unrelated to anonymous Web visitors.
- **File type/size validation**: `docs/security.md` documents magic-byte
  verification, size limits, extension allowlisting, and MIME
  cross-checking as pre-processing gates. This is a repository-wide
  documented invariant, not Web-specific, but applies to Web since it shares
  the same validation code.
- **Retention / deletion**: by design, nothing is retained for the Web
  variant — no upload ever leaves the browser, so there is no server-side
  file to delete or expire. This differs from the Desktop/Service builds,
  which do have `DOWNLOAD_TOKEN_TTL_MINUTES`-governed token expiry
  (`docs/security.md`) for processed outputs. Worth stating explicitly in
  user-facing privacy copy for Web, since "we delete your files after N
  minutes" (a Service/Desktop claim) does not apply the same way to Web
  ("we never receive your files" is the stronger, correct claim there).
- **Data protection**: consistent with local-first processing — no file
  content transits any Anclora server for the Web variant. The main residual
  data-protection surface for Web is standard web analytics/telemetry, which
  was not in scope for this pass (not searched here).

## Gaps worth tracking (not fixed in this pass)

1. No confirmed edge/CDN-level rate limiting or bot management for the
   Web deployment — acceptable today given the low per-request cost, but
   should be revisited if Web ever gains any server-side route (e.g. a
   future analytics or feedback endpoint) that isn't purely static.
2. Engine-level size/ratio guards (50MB, 100x, 10k entries) were verified to
   exist in shared code, not proven to be reachable and enforced specifically
   in the compiled Web/browser bundle — worth a targeted follow-up test
   (upload an oversized/zip-bomb-shaped file through the actual deployed Web
   tool) rather than relying on this document alone.
3. No documented anti-scraping/anti-automation stance for the Web tool.
   Given it's a free, anonymous, no-login product, this may be an accepted
   business risk rather than a defect — flagging for an explicit decision
   rather than assuming either way.
