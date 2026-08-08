# Webhook Flow

Completed and failed jobs emit the same webhook contract as Service jobs.
Talent verifies `X-Anclora-Signature`, timestamp tolerance and dedupe id.
If webhooks fail, Talent polls `/api/v1/jobs/:id`.
