import type { NextRequest } from "next/server";
import crypto from "crypto";
import { CONFIG } from "@/lib/config";
import { isLoopbackOnlyRuntime } from "@/lib/deployment-target";

/**
 * Shared gate for local-admin-only actions (cookies upload, app shutdown):
 * always allowed from the loopback-bound portable launchers; on any other
 * deployment (VPS/service) requires a matching ANCLORA_FILESTUDIO_COOKIES_UPLOAD_TOKEN
 * and fails closed when none is configured. The env var name predates this
 * being a general admin token — kept as-is so an already-configured VPS
 * doesn't need reconfiguring.
 */

const ADMIN_TOKEN_HEADER = "x-anclora-admin-token";

function tokenFromRequest(req: NextRequest): string {
  return req.headers.get(ADMIN_TOKEN_HEADER) ?? "";
}

/** Constant-time token comparison — avoids leaking length/prefix via timing. */
function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isAdminAuthorized(req: NextRequest): boolean {
  if (isLoopbackOnlyRuntime()) return true;
  const token = CONFIG.security.cookiesUploadToken;
  if (!token) return false; // fail closed — no token configured, no non-loopback access
  return tokensMatch(tokenFromRequest(req), token);
}

export function adminAuthStatus(): { requiresToken: boolean; tokenConfigured: boolean } {
  return {
    requiresToken: !isLoopbackOnlyRuntime(),
    tokenConfigured: Boolean(CONFIG.security.cookiesUploadToken),
  };
}
