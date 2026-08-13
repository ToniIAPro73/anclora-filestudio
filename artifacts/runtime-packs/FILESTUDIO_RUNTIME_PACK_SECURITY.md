# Runtime Pack Security

## Trust Model

Core contains a trusted static registry. Runtime pack manifests are not accepted from arbitrary internet sources.

Allowed source rules:

- HTTPS only.
- URL origin must match `trustedOrigin`.
- No dynamic `latest` URL.
- SHA256 must be present and match the downloaded archive before extraction.

## Install Safety

Install flow:

1. Download to temp.
2. Verify SHA256.
3. Extract to staging.
4. Reject zip-slip/path traversal/absolute paths/symlinks.
5. Preserve executable permissions.
6. Run health probe.
7. Atomic rename to final versioned path.

Failed installs remove staging and keep the previous installed version.

## Execution Safety

The HTML renderer keeps existing security defaults:

- JavaScript disabled.
- Network requests blocked.
- Local file access restricted to the input directory.
- Isolated temp browser profile.
- Timeout.
- Cleanup.
- `shell: false` for process execution.

## Sandbox

Product policy does not require `--no-sandbox`. VPS QA may still need `--no-sandbox` due container limitations. This is environment-specific and not a runtime-pack requirement.

## Offline Install

Offline strategy: user imports an official pre-downloaded pack archive. The same trusted local manifest and SHA verification are used. No arbitrary manifest is accepted.
