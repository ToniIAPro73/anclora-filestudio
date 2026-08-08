# Authentication

Talent service tokens require these scopes:

```text
filestudio:uploads:create
filestudio:jobs:create
filestudio:jobs:read
filestudio:jobs:cancel
filestudio:results:read
filestudio:webhooks:manage
filestudio:agent-jobs:create
```

Paired device tokens use `POST /api/v1/agent/token/refresh`. Access TTL is 10 minutes.
Refresh TTL is 30 days. Refresh token reuse returns
`AUTH_REFRESH_REUSE_DETECTED` and revokes the device.
