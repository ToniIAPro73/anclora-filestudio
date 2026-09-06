// Cross-platform executable resolution helpers.
//
// Problem: a bare command name (e.g. "ffmpeg") only resolves via the OS PATH
// lookup performed by child_process.spawn(), which uses this process's
// inherited process.env.PATH. On macOS that PATH can be much narrower than
// an interactive shell's: a portable app launched by double-clicking from
// Finder (or via `open`) does not source ~/.zprofile / ~/.zshrc, so
// Homebrew's `/opt/homebrew/bin` — added to PATH there via
// `eval "$(brew shellenv)"` — is often absent even though the tool is
// correctly installed.
//
// This module resolves bare names to absolute paths by searching
// process.env.PATH plus a fixed list of standard extra directories on
// macOS, so detection does not depend on how the process was launched.
// It never modifies process.env.PATH itself. Windows and Linux behavior is
// unchanged — resolveMacAwareBinary returns the input verbatim there.

import fs from "fs";
import os from "os";
import path from "path";
import { getAncloraRuntimePlatform } from "./runtime-platform";

export function isAncloraMacRuntime(): boolean {
  return getAncloraRuntimePlatform() === "darwin";
}

/**
 * Standard directories where Homebrew (Apple Silicon and Intel) and system
 * tools live on macOS, beyond whatever is in process.env.PATH.
 */
export function macExtraSearchDirs(): string[] {
  return [
    "/opt/homebrew/bin", // Homebrew, Apple Silicon
    "/opt/homebrew/sbin",
    "/usr/local/bin", // Homebrew, Intel (and manually-installed tools)
    "/usr/local/sbin",
    "/usr/bin",
    "/bin",
  ];
}

function isExecutableFile(
  candidate: string,
  existsSync: (p: string) => boolean,
  statSync: (p: string) => fs.Stats,
  accessSync: (p: string, mode: number) => void
): boolean {
  try {
    if (!existsSync(candidate)) return false;
    const stat = statSync(candidate);
    if (!stat.isFile()) return false;
    if (process.platform === "win32") return true;
    accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export interface AugmentedPathSearchOptions {
  pathEnv?: string;
  extraDirs?: string[];
  existsSync?: (p: string) => boolean;
  statSync?: (p: string) => fs.Stats;
  /** Injectable for tests. Defaults to fs.accessSync (real executable-bit check). */
  accessSync?: (p: string, mode: number) => void;
}

/**
 * Search process.env.PATH (or an injected override) plus extra directories
 * for an executable with the given bare name. Returns an absolute path if
 * found, else null. Never throws, never modifies process.env.
 */
export function resolveOnAugmentedPath(
  name: string,
  options: AugmentedPathSearchOptions = {}
): string | null {
  const {
    pathEnv = process.env.PATH || "",
    extraDirs = isAncloraMacRuntime() ? macExtraSearchDirs() : [],
    existsSync = fs.existsSync,
    statSync = fs.statSync,
    accessSync = fs.accessSync,
  } = options;

  const pathDirs = pathEnv.split(path.delimiter).filter(Boolean);
  const seen = new Set<string>();
  const searchDirs: string[] = [];
  for (const dir of [...pathDirs, ...extraDirs]) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    searchDirs.push(dir);
  }

  for (const dir of searchDirs) {
    const candidate = path.join(dir, name);
    if (isExecutableFile(candidate, existsSync, statSync, accessSync)) return candidate;
  }
  return null;
}

/**
 * Resolve a bare command name to an absolute path on macOS using PATH plus
 * standard extra directories (Homebrew, /usr/local/bin, ...). On any other
 * platform, or when the name already looks like a path, or when it cannot
 * be found anywhere, returns the input unchanged — existing PATH-based
 * spawn/probe behavior (and graceful "not found" degradation) is preserved.
 */
export function resolveMacAwareBinary(bareName: string): string {
  if (!bareName) return bareName;
  if (!isAncloraMacRuntime()) return bareName;
  if (bareName.includes("/") || bareName.includes("\\")) return bareName;
  return resolveOnAugmentedPath(bareName) ?? bareName;
}

/**
 * macOS-specific LibreOffice discovery: PATH (+ Homebrew extra dirs) first,
 * then the standard .app bundle install locations. LibreOffice ships as a
 * .app bundle and does not place `soffice` on PATH by default — nor does
 * Homebrew's own `libreoffice` cask symlink a CLI binary — so a plain PATH
 * search alone is not enough. Returns an absolute path, or null if
 * LibreOffice cannot be found anywhere.
 */
export function resolveMacLibreOfficeBinary(
  existsSync: (p: string) => boolean = fs.existsSync,
  homeDir: string = os.homedir(),
  pathSearchOptions: AugmentedPathSearchOptions = {}
): string | null {
  const searchOptions: AugmentedPathSearchOptions = { existsSync, ...pathSearchOptions };
  const onPath =
    resolveOnAugmentedPath("soffice", searchOptions) ??
    resolveOnAugmentedPath("libreoffice", searchOptions);
  if (onPath) return onPath;

  const appBundleCandidates = [
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    path.join(homeDir, "Applications", "LibreOffice.app", "Contents", "MacOS", "soffice"),
  ];
  for (const candidate of appBundleCandidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
