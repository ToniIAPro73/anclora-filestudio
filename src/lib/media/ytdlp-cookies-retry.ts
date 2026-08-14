/**
 * Shared "try anonymous first, cookies as fallback" retry strategy for
 * yt-dlp calls (both metadata/analyze and download/conversion).
 *
 * A stale or rotated cookie doesn't just fail to help — it can actively
 * break videos that would otherwise download fine anonymously (YouTube
 * revokes signed segment URLs mid-download when it flags the session).
 * So cookies are never applied on the first attempt: only when that first,
 * anonymous attempt fails AND a cookies file is actually configured do we
 * retry once with cookies. If both attempts fail, the caller decides which
 * error to surface (typically the cookies attempt's, since it's the more
 * informed one).
 */

import fs from "fs";

export interface CookiesFallbackResult<T> {
  result: T;
  usedCookies: boolean;
}

// Domains that share the same login/session for cookie-matching purposes.
const DOMAIN_FAMILIES: readonly (readonly string[])[] = [
  ["youtube.com", "youtu.be"],
  ["twitter.com", "x.com"],
  ["instagram.com"],
];

function domainFamilyFor(hostname: string): readonly string[] {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  for (const family of DOMAIN_FAMILIES) {
    if (family.some((d) => h === d || h.endsWith(`.${d}`))) return family;
  }
  return [h];
}

/**
 * True only when the cookies.txt file actually contains a cookie for the
 * URL's own domain (or a known same-platform alias, e.g. youtu.be ↔
 * youtube.com) — never applies, say, YouTube cookies as a fallback for a
 * Vimeo URL just because *some* cookies file happens to be configured.
 */
export function cookiesFileHasDomainFor(cookiesPath: string, url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  const family = domainFamilyFor(hostname);

  let content: string;
  try {
    content = fs.readFileSync(cookiesPath, "utf8");
  } catch {
    return false;
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const domainField = trimmed.split("\t")[0]?.toLowerCase().replace(/^\./, "");
    if (!domainField) continue;
    if (family.some((d) => domainField === d || domainField.endsWith(`.${d}`))) return true;
  }
  return false;
}

export async function withCookiesFallback<T>(
  attempt: (useCookies: boolean) => Promise<T>,
  cookiesConfigured: boolean
): Promise<CookiesFallbackResult<T>> {
  try {
    return { result: await attempt(false), usedCookies: false };
  } catch (err) {
    if (!cookiesConfigured) throw err;
    return { result: await attempt(true), usedCookies: true };
  }
}
