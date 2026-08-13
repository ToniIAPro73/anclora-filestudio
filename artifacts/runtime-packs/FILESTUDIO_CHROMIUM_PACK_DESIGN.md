# Chromium Runtime Pack Design

## Pack

ID: `chromium-runtime`

Version: `151.0.7922.34`

Playwright package: `playwright-core@1.62.1`

Playwright browser revision observed locally: `1234`

Chrome for Testing revision: `1654411`

## Linux Manifest

Source:

`https://storage.googleapis.com/chrome-for-testing-public/151.0.7922.34/linux64/chrome-linux64.zip`

SHA256:

`ae8736ac28bc69278551500f219fc749575648263c43ec5990749eff43b9fcf8`

Compressed size: `193,282,658` bytes.

Installed size: `406,847,046` bytes.

Entry executable:

`chrome-linux64/chrome`

## Windows Manifest

Source:

`https://storage.googleapis.com/chrome-for-testing-public/151.0.7922.34/win64/chrome-win64.zip`

SHA256:

`045621e45a9dd27002c7fc1d8e10fe9f5f71f4cadbf44ec6f397f56f0179725c`

Compressed size: `201,068,834` bytes.

Installed size: `447,417,940` bytes.

Entry executable:

`chrome-win64/chrome.exe`

## Resolution Order

1. Official installed runtime pack.
2. Explicit override: `ANCLORA_FILESTUDIO_CHROMIUM_PATH`.
3. Optional system fallback only if `ANCLORA_FILESTUDIO_ALLOW_SYSTEM_CHROME=1`.

No Playwright global cache resolution in product behavior.

## Health Probe

Current probe:

`chrome --version`

The full renderer E2E launches Chromium through Playwright, blocks network, disables JavaScript, uses an isolated temp profile, renders a minimal page and validates PNG/TIFF output through Sharp.
