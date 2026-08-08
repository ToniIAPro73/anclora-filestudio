# Operations

Operational checks:

- `GET /api/v1/health` confirms process liveness.
- `GET /api/v1/ready` checks configured dependencies.
- `GET /api/v1/metrics` exposes Prometheus metrics.
- Worker emits heartbeat logs and handles `SIGTERM`.
- `POST /api/v1/agent-jobs` accepts consumer multipart payloads for Local Agent
  work.
- Backup and restore scripts parse required `.env` keys instead of sourcing
  secrets as shell.

Docker is only for Service/VPS/CI. Desktop and Local Agent remain Docker-free.

## Desktop PRO

Desktop PRO runs locally and should bind to loopback only. Use diagnostics to
verify native tools before large jobs. Portables must not package `.env.local`,
`.git` or secrets.

Production deployment and GitHub Release creation require explicit approval.

## Processing Modes

Every consumer operation must declare the processing mode to the user:

|Operation|Web|Service|Local Agent|
|---|---:|---:|---:|
|`data.json-to-yaml`|Yes|Yes|Yes|
|`data.yaml-to-json`|Yes|Yes|Yes|
|`image:resize`|Yes|Yes|Yes|
|`image:convert`|Yes|Yes|Yes|
|`convert-ebook`|No|Optional Calibre|Optional Calibre|
|`pdf:ocr`|No|Optional Tesseract/Poppler|Optional Tesseract/Poppler|
