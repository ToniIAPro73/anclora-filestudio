# Decision Draft — Expose FileStudio as Product Infrastructure

Status: owner decision required.

Current repo classification is internal. Anclora Talent needs FileStudio as
exposed product infrastructure for scoped, multi-app consumption.

Recommendation:

- Keep repository private.
- Treat Service API as product infrastructure with explicit owner, staging and
  production runbooks.
- Require scoped client tokens per consuming app.
- Keep `yt-dlp` excluded from external contracts and product UI.
- Require rate limits by `client_id`, operation and scope before production
  exposure.
- Finish PostgreSQL persistence for Local Agent jobs before SLA-backed rollout.
