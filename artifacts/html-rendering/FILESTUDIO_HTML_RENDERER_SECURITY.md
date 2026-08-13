# FileStudio HTML Renderer Security

## Threat Model

HTML inputs are untrusted.

Relevant risks:

- script execution
- remote network fetch
- local file reads outside the input package/workspace
- `file://` references
- SSRF-like renderer fetches
- malicious SVG
- iframes
- huge canvas or huge document resource bombs
- infinite JavaScript loops
- persistent cookies/profile state

## Defaults

JavaScript default: disabled

Network default: blocked

Local assets: allowed only if the resolved `file://` path stays inside the input file directory.

Profile: isolated temp profile per job.

Cleanup: profile removed in `finally`.

Timeouts: Playwright launch/content/screenshot timeouts bounded by the job timeout.

External state: no user browser profile and no persistent cookies.

## Request Policy

Allowed:

- `data:`
- `blob:`
- `about:`
- `file://` inside the input directory

Blocked:

- `http:`
- `https:`
- `file://` outside the input directory
- other schemes

## Long Document Guard

Limits:

- max height: 16000 px
- max pixels: 24000000

Behavior:

- fail with controlled error when exceeded
- no silent clipping
- no automatic multipage mode in this phase

## Validated Cases

- remote image request blocked
- JavaScript DOM mutation did not run
- oversized document rejected before output write
- path with spaces and local image rendered
- browser profile cleanup verified
- output is nonblank and decodable by Sharp

