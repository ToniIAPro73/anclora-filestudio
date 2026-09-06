#!/usr/bin/env node
// =============================================================================
// generate-release-manifest.mjs
// Reads the THREE public release artifacts users actually download —
// Windows Setup.exe, macOS DMG, Linux portable tar.zst — computes their
// SHA-256, and writes release-manifest.json + SHA256SUMS.txt next to them.
//
// Windows/macOS portables are internal build payload only (used to build the
// installer/.app) and are intentionally NOT part of this public manifest.
//
// Usage:
//   node scripts/generate-release-manifest.mjs \
//     --dir dist/release \
//     --version 0.2.0 \
//     --commit <full-sha> \
//     --linux-tar dist/linux/Anclora-FileStudio-Linux-x64.tar.zst \
//     --macos-dmg dist/release/Anclora-FileStudio-macOS-arm64.dmg \
//     --windows-setup dist/release/Anclora-FileStudio-Setup-Windows-x64.exe
//
// Every required input file must exist; this script does not build anything.
// =============================================================================

import { createHash } from "node:crypto";
import { createReadStream, statSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i++;
    }
  }
  return args;
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function describeArtifact(filePath, extra = {}) {
  if (!existsSync(filePath)) {
    throw new Error(`Artifact not found: ${filePath}`);
  }
  const stat = statSync(filePath);
  const sha256 = await sha256File(filePath);
  return {
    file: path.basename(filePath),
    sizeBytes: stat.size,
    sha256,
    ...extra,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const required = ["dir", "version", "commit", "linux-tar", "macos-dmg", "windows-setup"];
  for (const key of required) {
    if (!args[key]) throw new Error(`Missing required --${key}`);
  }

  const outDir = args.dir;
  mkdirSync(outDir, { recursive: true });

  const platformMeta = {
    version: args.version,
    commit: args.commit,
  };

  const linuxPortable = await describeArtifact(args["linux-tar"], { platform: "linux", arch: "x64", ...platformMeta });
  const macosDmg = await describeArtifact(args["macos-dmg"], { platform: "darwin", arch: "arm64", ...platformMeta });
  const windowsSetup = await describeArtifact(args["windows-setup"], { platform: "windows", arch: "x64", ...platformMeta });

  const manifest = {
    version: args.version,
    commit: args.commit,
    commitShort: args.commit.slice(0, 7),
    buildDateUtc: new Date().toISOString(),
    // Public, user-facing artifacts only. Windows/macOS portables are
    // internal build payload (see docs/release) and are not listed here.
    windowsSetup,
    macosDmg,
    linuxPortable,
  };

  const manifestPath = path.join(outDir, "release-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Wrote ${manifestPath}`);

  const sumsLines = [
    `${windowsSetup.sha256}  ${windowsSetup.file}`,
    `${macosDmg.sha256}  ${macosDmg.file}`,
    `${linuxPortable.sha256}  ${linuxPortable.file}`,
  ];
  const sumsPath = path.join(outDir, "SHA256SUMS.txt");
  writeFileSync(sumsPath, sumsLines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${sumsPath}`);

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(`[generate-release-manifest] ${err.message}`);
  process.exit(1);
});
