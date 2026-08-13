# Runtime Pack Product Impact

## Models Evaluated

## A. Bundled In Core

Rejected. It adds about 389 MiB installed footprint to every Core install for a specialized renderer capability.

## B. Optional Official Runtime Pack

Selected. Core remains lighter; users install Chromium only when an HTML/markup image conversion needs it. Pack is versioned, verified, diagnosticable and removable.

## C. System Runtime

Rejected as primary model. User Chrome is not reproducible and can change independently from FileStudio.

## D. Hybrid

Accepted only as advanced fallback. Official pack remains first. Explicit override and opt-in system fallback are useful for dev/VPS, not default product behavior.

## Size

Core Chromium bundled: `NO`.

Linux Chromium download: `193,282,658` bytes.

Linux Chromium installed: `406,847,046` bytes.

Windows Chromium download: `201,068,834` bytes.

Windows Chromium installed: `447,417,940` bytes.

First-use impact: user sees an explicit runtime requirement before download. No silent install.

## SBOM And Notices

Core SBOM must not list Chromium as bundled when Core does not include it.

Runtime pack SBOM/notices are separate:

- `chromium-runtime`
- version `151.0.7922.34`
- source URL and SHA256 in static registry
- license/notices exposed through pack metadata

## Upgrade And Rollback

No silent auto-update.

Upgrade installs the new version to staging first. If health probe fails, the current installed version remains active.

Side-by-side versions are supported by directory layout, but product policy should expose one active version per pack by default.

## Uninstall

`RuntimePackManager.uninstall(id)` removes only that pack/version directory. It does not touch user data.
