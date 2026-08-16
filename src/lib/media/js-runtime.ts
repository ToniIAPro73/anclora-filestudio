/**
 * Explicit resolution of the Node.js runtime used for yt-dlp's JavaScript
 * capabilities (`--js-runtimes node:<path>`).
 *
 * yt-dlp needs a JS runtime to solve signed/n-challenged format URLs. That
 * is a QUESTION OF CAPABILITY, not authentication: it must be available on
 * anonymous requests too, not only when cookies are in play.
 *
 * Crucially, `process.execPath` is NOT assumed to be the right node: in a
 * portable distribution the server may have been launched through a
 * launcher/wrapper while the canonical bundled runtime lives at
 * `<dist>/runtime/node` (Linux) or `<dist>/runtime\node.exe` (Windows).
 * Resolution order:
 *
 * 1. ANCLORA_FILESTUDIO_NODE_PATH (explicit canonical path — the portable
 *    launchers export it, pointing at the bundled runtime).
 * 2. `<cwd>/runtime/<node|node.exe>` — portable convention, derived from
 *    the distribution root (portable launchers run with the dist root as
 *    cwd).
 * 3. process.execPath — dev mode / fallback (the node running this server
 *    is a perfectly good JS runtime for yt-dlp).
 */
import fs from "fs";
import path from "path";
import { isAncloraWindowsRuntime } from "../runtime-platform";

export function resolveYtdlpNodeRuntime(): string | null {
  const explicit = process.env.ANCLORA_FILESTUDIO_NODE_PATH?.trim();
  if (explicit) {
    // Guard: an explicit path that does not exist (or is a directory) must
    // not be used — it would make every yt-dlp spawn fail with a confusing
    // error. Fall through to the canonical resolution chain instead, so a
    // misconfigured env var degrades gracefully instead of breaking jobs.
    try {
      if (fs.statSync(explicit).isFile()) return explicit;
    } catch {
      // ENOENT/ENOTDIR/EACCES → keep resolving
    }
  }

  const exeName = isAncloraWindowsRuntime() ? "node.exe" : "node";
  const portable = path.join(process.cwd(), "runtime", exeName);
  if (fs.existsSync(portable)) return portable;

  if (process.execPath && fs.existsSync(process.execPath)) return process.execPath;

  return null;
}