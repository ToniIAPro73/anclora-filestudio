# Error Mapping

|FileStudio code|Talent handling|
|---|---|
|`AUTH_INSUFFICIENT_SCOPE`|Disable integration and alert operator.|
|`AUTH_EXPIRED_TOKEN`|Refresh token, then retry.|
|`AUTH_REFRESH_REUSE_DETECTED`|Re-pair device.|
|`UPLOAD_TOO_LARGE`|Ask user for smaller file.|
|`UPLOAD_MIME_REJECTED`|Show unsupported format.|
|`OPERATION_UNAVAILABLE`|Route to next allowed mode.|
|`VALIDATION_FAILED`|Treat as integration contract bug.|
