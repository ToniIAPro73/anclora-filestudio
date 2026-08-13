import type { RuntimePackDefinition } from "../types";

export const CHROMIUM_RUNTIME_VERSION = "151.0.7922.34";
export const CHROMIUM_PLAYWRIGHT_REVISION = "1234";
export const CHROMIUM_CFT_REVISION = "1654411";

export const CHROMIUM_RUNTIME_PACKS: RuntimePackDefinition[] = [
  {
    id: "chromium-runtime",
    name: "Chromium Renderer Runtime",
    version: CHROMIUM_RUNTIME_VERSION,
    revision: CHROMIUM_CFT_REVISION,
    platform: "linux",
    architecture: "x64",
    source: {
      type: "https",
      url: "https://storage.googleapis.com/chrome-for-testing-public/151.0.7922.34/linux64/chrome-linux64.zip",
      trustedOrigin: "https://storage.googleapis.com",
    },
    sha256: "ae8736ac28bc69278551500f219fc749575648263c43ec5990749eff43b9fcf8",
    compressedSize: 193_282_658,
    installedSize: 406_847_046,
    license: {
      name: "Chrome for Testing / Chromium third-party notices",
      url: "https://chromium.googlesource.com/chromium/src/+/main/LICENSE",
    },
    notices: [
      "Runtime pack notices are tracked separately from Core notices.",
      "Chrome for Testing is downloaded from a fixed official Google Storage URL.",
    ],
    sbom: "artifacts/runtime-packs/chromium-runtime-151.0.7922.34.sbom.json",
    capabilities: ["HTML_RENDERER", "html-to-png", "html-to-tiff"],
    executablePaths: {
      linux: "chrome-linux64/chrome",
      windows: "chrome-win64/chrome.exe",
      darwin: "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    },
    healthProbe: {
      type: "chromium",
      executableKey: "linux",
      args: ["--version"],
      expectedVersion: CHROMIUM_RUNTIME_VERSION,
      timeoutMs: 8_000,
    },
  },
  {
    id: "chromium-runtime",
    name: "Chromium Renderer Runtime",
    version: CHROMIUM_RUNTIME_VERSION,
    revision: CHROMIUM_CFT_REVISION,
    platform: "windows",
    architecture: "x64",
    source: {
      type: "https",
      url: "https://storage.googleapis.com/chrome-for-testing-public/151.0.7922.34/win64/chrome-win64.zip",
      trustedOrigin: "https://storage.googleapis.com",
    },
    sha256: "045621e45a9dd27002c7fc1d8e10fe9f5f71f4cadbf44ec6f397f56f0179725c",
    compressedSize: 201_068_834,
    installedSize: 447_417_940,
    license: {
      name: "Chrome for Testing / Chromium third-party notices",
      url: "https://chromium.googlesource.com/chromium/src/+/main/LICENSE",
    },
    notices: [
      "Runtime pack notices are tracked separately from Core notices.",
      "Chrome for Testing is downloaded from a fixed official Google Storage URL.",
    ],
    sbom: "artifacts/runtime-packs/chromium-runtime-151.0.7922.34.sbom.json",
    capabilities: ["HTML_RENDERER", "html-to-png", "html-to-tiff"],
    executablePaths: {
      linux: "chrome-linux64/chrome",
      windows: "chrome-win64/chrome.exe",
      darwin: "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    },
    healthProbe: {
      type: "chromium",
      executableKey: "windows",
      args: ["--version"],
      expectedVersion: CHROMIUM_RUNTIME_VERSION,
      timeoutMs: 8_000,
    },
  },
];
