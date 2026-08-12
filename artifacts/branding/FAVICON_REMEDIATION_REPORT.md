# FileStudio Favicon Remediation Report

## SOURCE CANONICAL LOGO

- `public/brand/anclora-filestudio.png`
- PNG, `1254x1254`
- SHA-256: `c77d7040faa2a500ec353f10f6a54c10f22986beab2673a8f1d7a9d29a01b5b4`

## GENERATED ASSETS

All generated assets were derived from `public/brand/anclora-filestudio.png`.

| Asset | Format | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| `public/favicon-32.png` | PNG | 32x32 | `dae79a4eb5e87187d0fc4b68a92821bf5bdccc3047f29c374efde83bc9a346a2` |
| `public/favicon-512.png` | PNG | 512x512 | `dcebc03b88f0807387975cb2853897b02ac2740b76ec08b56d63b4355356aa73` |
| `public/icon.png` | PNG | 512x512 | `dcebc03b88f0807387975cb2853897b02ac2740b76ec08b56d63b4355356aa73` |
| `public/apple-touch-icon.png` | PNG | 180x180 | `8886697996420e1072c906b5d29d6e356ea712457fecffe3f94cc078e7edf8b0` |
| `src/app/icon.png` | PNG | 512x512 | `dcebc03b88f0807387975cb2853897b02ac2740b76ec08b56d63b4355356aa73` |
| `src/app/apple-icon.png` | PNG | 180x180 | `8886697996420e1072c906b5d29d6e356ea712457fecffe3f94cc078e7edf8b0` |
| `public/favicon.ico` | ICO | 16, 32, 48, 64, 128, 256 | `7488c656bbfe0ccb9093121463d3ed5e7a7c6ac94938288c4698bf9e56f27a0b` |

`src/assets/logo.png` had no active consumers and was removed to prevent future regressions.

## ICO VALIDATION

- `file public/favicon.ico` recognizes it as `MS Windows icon resource - 6 icons`.
- Header: `00000100`
- Entries: `16x16`, `32x32`, `48x48`, `64x64`, `128x128`, `256x256`
- Each embedded image has a PNG signature.

## STALE HASH CHECK

- Known stale SHA-256: `f2951f31666919dc57525f5f4aa31c7f7010e54652f93f79362799f716eda948`
- No active favicon/icon asset matches the stale hash.

## NEXT METADATA CHECK

`src/app/layout.tsx` still references existing assets:

- `/favicon-32.png`
- `/favicon-512.png`
- `/favicon.ico`
- `/apple-touch-icon.png`

Automatic App Router icons are present:

- `src/app/icon.png`
- `src/app/apple-icon.png`

No metadata change was required.

## WINDOWS PORTABLE CHECK

- `pnpm build:portable:windows`: PASS
- `pnpm verify:portable:windows`: PASS, 98 checks
- Artifact: `dist/windows/Anclora-FileStudio-Windows-x64-Core.zip`
- Artifact SHA-256: `4d0063e8ccead51871e207146143c4250d919607d71acf1b289e7f61945cb265`
- ZIP contains updated `app/public/favicon.ico`, `favicon-32.png`, `favicon-512.png`, `apple-touch-icon.png`, `icon.png`, and `brand/anclora-filestudio.png`.

## LINUX PORTABLE CHECK

- `pnpm build:portable:linux`: PASS
- `pnpm verify:portable:linux`: PASS, 54 checks, 0 warnings, 0 failures
- Artifact: `dist/linux/Anclora-FileStudio-Linux-x64.tar.zst`
- Artifact SHA-256: `91c6e9a4eacc8a643dfc13ee5faf5544b0273a272f84ce157debe2e5f51fa987`
- Tarball contains updated `app/public/favicon.ico`, `favicon-32.png`, `favicon-512.png`, `apple-touch-icon.png`, `icon.png`, and `brand/anclora-filestudio.png`.

## TYPECHECK

- `pnpm typecheck`: PASS

## LINT

- `pnpm lint`: PASS with 3 existing warnings in `src/components/inspector/compare-inspector-modal.tsx` for `<img>` usage.

## TEST

- `pnpm test`: PASS
- 67 files passed, 1 skipped
- 852 tests passed, 1 skipped

## BUILD

- `pnpm build`: PASS
- Next.js build emitted existing Turbopack NFT warnings, no build failure.

FILESTUDIO FAVICON REMEDIATION: PASS
