# Decision: YouTube conversion through a remote worker

**Status:** Authorized architecture; implementation and infrastructure rollout are separate stages.  
**Scope:** FileStudio Desktop/local YouTube URL conversion to MP3/MP4.

## Decision

Desktop sends YouTube metadata and conversion requests through a private Vercel API route.
The API authenticates the Desktop server using a server-side bearer token and forwards the
request to a token-protected HTTP control surface on the VPS worker. The VPS worker runs
yt-dlp and FFmpeg, queues jobs through BullMQ/Redis, stores job state in PostgreSQL and
stores temporary artifacts on its private volume. Desktop streams completed artifacts
directly from the VPS through its local server; Vercel never proxies media bytes.

The worker uses anonymous yt-dlp requests and does not receive or store the user's YouTube
cookies. This reduces dependence on the user's IP and cookies; it cannot guarantee access
when YouTube blocks anonymous extraction, requires a PO token, or restricts the video.

## Boundaries

- The conversion controls remain Desktop/local only; Vercel Web does not expose this flow.
- Only validated HTTPS YouTube URLs and MP3/MP4 output are accepted by the worker.
- yt-dlp runs with `--ignore-config`; no browser cookie files are passed.
- Work is limited to 12 hours per job. The previous local metadata duration cap does not
  apply when the remote worker path is configured.
- PostgreSQL and Redis are dedicated to the remote service. Local Desktop SQLite remains
  unchanged.
- Infrastructure and secrets must be configured outside source control before use.
- This machine-token setup is suitable only for a controlled installation. A distributable
  Desktop product must use per-user credentials or an enrollment flow; it must not ship a
  shared long-lived bearer token in its installer.

## Operational configuration

Vercel requires `YOUTUBE_REMOTE_API_TOKEN`, `YOUTUBE_WORKER_URL` (the VPS HTTPS URL ending
in `/worker`), and `YOUTUBE_WORKER_TOKEN`. Desktop's server environment requires
`ANCLORA_FILESTUDIO_REMOTE_API_URL`, `ANCLORA_FILESTUDIO_REMOTE_API_TOKEN`,
`ANCLORA_FILESTUDIO_YOUTUBE_WORKER_URL`, and
`ANCLORA_FILESTUDIO_YOUTUBE_WORKER_TOKEN`. Each token is server-only and must be generated
and installed independently in the corresponding protected environment.

VPS Compose also requires PostgreSQL/Redis credentials. The worker schema is created
idempotently on startup. Terminal artifacts are removed after 24 hours.

## Error model

The worker classifies failures into stable codes returned in job status (`errorCode`) and
metadata responses (`code`): `YOUTUBE_ANONYMOUS_ACCESS_BLOCKED`, `YOUTUBE_UNAVAILABLE`,
`YOUTUBE_TIMEOUT`, `YOUTUBE_FILE_TOO_LARGE`, `YOUTUBE_EXTRACTION_FAILED`, plus `QUEUE_FULL`
and `ARTIFACT_EXPIRED`. Transport failures use `REMOTE_YOUTUBE_NOT_CONFIGURED`,
`REMOTE_YOUTUBE_HTTPS_REQUIRED`, `REMOTE_WORKER_TIMEOUT` and `REMOTE_WORKER_UNAVAILABLE`.
Anonymous-access failures are never reported as cookie errors and the product never asks
for cookies for this path. Raw yt-dlp stderr is not stored in job records.

## Known limits

- No guarantee of anonymous extraction. YouTube may block data-center IPs, require a PO
  token or a JavaScript challenge solver, or restrict a video. The worker image does not add
  a JS runtime or challenge-bypass mechanism; if extraction fails for that reason the job
  fails with `YOUTUBE_ANONYMOUS_ACCESS_BLOCKED`. Adding one would be a separate decision.
- Progress is coarse (queued → downloading → completed/failed/cancelled).
- Cancellation stops the active yt-dlp process group on the worker that runs the job; a
  second worker replica would require a shared cancellation signal.
- The current shared-token model is for a controlled installation only.

## Rollout status

Implementation is complete locally and covered by automated tests; end-to-end validation
against real infrastructure is pending. No Vercel environment variables, VPS resources,
database, DNS records, deployment, or production data have been modified by this decision.
Activation steps live in `docs/implementation/anclora-filestudio-service-api/deployment-vps.md`.
