#!/usr/bin/env node
// =============================================================================
// generate-release-manifest.mjs
// Reads the three release artifacts (Windows portable ZIP, Linux portable
// tar.zst, Windows Setup.exe) from a directory, computes their SHA-256, and
// writes release-manifest.json + SHA256SUMS.txt next to them.
//
// Usage:
//   node scripts/generate-release-manifest.mjs \
//     --dir dist/release \
//     --version 0.2.0 \
//     --commit <full-sha> \
//     --windows-zip dist/windows/Anclora-FileStudio-Windows-x64-Core.zip \
//     --linux-tar dist/linux/Anclora-FileStudio-Linux-x64.tar.zst \
//     --windows-setup dist/release/Anclora-FileStudio-Setup-Windows-x64.exe
//
// Every input file must exist; this script does not build anything.
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

async function describeArtifact(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Artifact not found: ${filePath}`);
  }
  const stat = statSync(filePath);
  const sha256 = await sha256File(filePath);
  return {
    file: path.basename(filePath),
    sizeBytes: stat.size,
    sha256,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const required = ["dir", "version", "commit", "windows-zip", "linux-tar"];
  for (const key of required) {
    if (!args[key]) throw new Error(`Missing required --${key}`);
  }

  const outDir = args.dir;
  mkdirSync(outDir, { recursive: true });

  const windowsPortable = await describeArtifact(args["windows-zip"]);
  const linuxPortable = await describeArtifact(args["linux-tar"]);
  const windowsSetup = args["windows-setup"] && existsSync(args["windows-setup"])
    ? await describeArtifact(args["windows-setup"])
    : null;

  const manifest = {
    version: args.version,
    commit: args.commit,
    commitShort: args.commit.slice(0, 7),
    buildDateUtc: new Date().toISOString(),
    windowsPortable,
    linuxPortable,
    ...(windowsSetup ? { windowsSetup } : {}),
  };

  const manifestPath = path.join(outDir, "release-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Wrote ${manifestPath}`);

  const sumsLines = [
    `${windowsPortable.sha256}  ${windowsPortable.file}`,
    `${linuxPortable.sha256}  ${linuxPortable.file}`,
  ];
  if (windowsSetup) {
    sumsLines.push(`${windowsSetup.sha256}  ${windowsSetup.file}`);
  }
  const sumsPath = path.join(outDir, "SHA256SUMS.txt");
  writeFileSync(sumsPath, sumsLines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${sumsPath}`);

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(`[generate-release-manifest] ${err.message}`);
  process.exit(1);
});
