# Anclora FileStudio API

Private Service API for uploads, jobs, Local Agent coordination, webhooks,
health, readiness and metrics.

Base path: `/api/v1`.
Contract version: `v1.1`.

JWT-protected endpoints require scoped service tokens. Agent job endpoints
require agent access tokens.

Consumer-facing Local Agent jobs use `POST /api/v1/agent-jobs` with multipart
form parts `input` and `meta`. Status is read through `GET /api/v1/jobs/:id`
with public states `queued`, `processing`, `completed`, `failed`, `cancelled`
and `expired`.
