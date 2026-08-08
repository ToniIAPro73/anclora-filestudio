# API Flow

Talent creates Local Agent work with `POST /api/v1/agent-jobs`.

Multipart parts:

```text
input = file bytes
meta = JSON contract
```

`meta` fields: `operation`, `options`, `requestingOrg`, `requestingApp`,
`retentionMinutes`, `timeoutMs`, `deviceId`, `workspaceId`, `inputFilename`,
`inputMimeType`.

Response `202`:

```json
{
  "jobId": "ajob_...",
  "status": "queued",
  "operation": "image:resize",
  "links": {
    "self": "/api/v1/jobs/ajob_...",
    "events": "/api/v1/jobs/ajob_.../events"
  }
}
```

Talent reads status through `GET /api/v1/jobs/:id`.
