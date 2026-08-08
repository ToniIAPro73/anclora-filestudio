# API Authentication

Service clients use asymmetric JWT bearer tokens. Required claims are
`client_id`, `sub`, `scopes`, `aud`, `exp` and a key id in the protected header.

Local Agents use pairing-issued access tokens and rotating refresh tokens.
Refresh token reuse revokes the device.

## Scopes

|Scope|Allows|
|---|---|
|`filestudio:uploads:create`|Create upload records for service jobs.|
|`filestudio:jobs:create`|Create service jobs.|
|`filestudio:jobs:read`|Read service and local-agent job status.|
|`filestudio:jobs:cancel`|Cancel jobs.|
|`filestudio:results:read`|Request one-use result download tokens.|
|`filestudio:webhooks:manage`|Manage webhook endpoints.|
|`filestudio:agent-jobs:create`|Create local-agent jobs.|
|`filestudio:admin`|Administrative access, including pairing approval.|

## Device Token Refresh

Consumers refresh paired-device credentials with
`POST /api/v1/agent/token/refresh`.
Access tokens last 10 minutes. Refresh tokens last 30 days and rotate on every
refresh. If an old refresh token is reused, FileStudio returns
`AUTH_REFRESH_REUSE_DETECTED` and revokes the device. Consumers must guide the
user through pairing again after persistent 401/403 responses.
