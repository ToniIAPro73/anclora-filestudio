# Staging Runbook

Staging uses `deploy/vps/` with dedicated PostgreSQL, Redis and signing keys.

Required settings:

```text
ANCLORA_FILESTUDIO_MODE=service
ANCLORA_FILESTUDIO_ENV=production
ANCLORA_FILESTUDIO_PUBLIC_BASE_URL=<staging-url>
ANCLORA_FILESTUDIO_DATABASE_URL=<staging-postgres>
ANCLORA_FILESTUDIO_REDIS_URL=<staging-redis>
ANCLORA_FILESTUDIO_JWT_ISSUER=<issuer>
ANCLORA_FILESTUDIO_JWT_AUDIENCE=anclora-filestudio-service
ANCLORA_FILESTUDIO_JWT_PUBLIC_KEYS_PATH=<public-keys-dir>
```

Smoke:

1. Run migrations.
2. Verify `/api/v1/health`, `/api/v1/ready` and `/api/v1/metrics`.
3. Issue a staging JWT for `client_id=anclora-talent` with documented scopes.
4. Run `scripts/external-e2e-smoke.sh` with an `agent-jobs` `image:resize` case.
5. Verify one-use result-token download and webhook delivery.

Do not commit secrets or generated private keys.
