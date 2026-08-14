import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CONFIG } from "@/lib/config";
import { isLoopbackOnlyRuntime } from "@/lib/deployment-target";

const MAX_COOKIES_FILE_BYTES = 256 * 1024; // generous for a few sites, rejects a full browser export
const MAX_DISTINCT_DOMAINS = 20; // catches "exported everything" by mistake

const COOKIES_FILE_NAME = "cookies.txt";

function cookiesFilePath(): string {
  return path.join(CONFIG.media.dataDir, COOKIES_FILE_NAME);
}

function tokenHeader(req: NextRequest): string {
  return req.headers.get("x-cookies-upload-token") ?? "";
}

/** Constant-time token comparison — avoids leaking length/prefix via timing. */
function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isAuthorized(req: NextRequest): boolean {
  if (isLoopbackOnlyRuntime()) return true;
  const token = CONFIG.security.cookiesUploadToken;
  if (!token) return false; // fail closed — no token configured, no non-loopback access
  return tokensMatch(tokenHeader(req), token);
}

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "No autorizado. Token de subida de cookies requerido o incorrecto.", code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

/** Very small sanity check — this is not a full Netscape-format parser. */
function looksLikeNetscapeCookiesFile(text: string): { valid: boolean; domainCount: number } {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const domains = new Set<string>();
  let fieldedLines = 0;
  for (const line of lines) {
    const fields = line.split("\t");
    if (fields.length >= 6) {
      fieldedLines++;
      domains.add(fields[0]);
    }
  }
  return { valid: fieldedLines > 0, domainCount: domains.size };
}

export async function GET() {
  const present = fs.existsSync(cookiesFilePath());
  return NextResponse.json({
    present,
    requiresToken: !isLoopbackOnlyRuntime(),
    tokenConfigured: Boolean(CONFIG.security.cookiesUploadToken),
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse();

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Se esperaba un archivo (multipart/form-data).", code: "INVALID_INPUT" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se ha enviado ningún archivo.", code: "INVALID_INPUT" }, { status: 400 });
  }

  if (file.size > MAX_COOKIES_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `El archivo supera ${MAX_COOKIES_FILE_BYTES / 1024} KB — probablemente exportaste todas las cookies del navegador en vez de solo el sitio necesario.`,
        code: "FILE_TOO_LARGE",
      },
      { status: 413 }
    );
  }

  const text = await file.text();
  const { valid, domainCount } = looksLikeNetscapeCookiesFile(text);
  if (!valid) {
    return NextResponse.json(
      { error: "El archivo no parece un cookies.txt válido (formato Netscape).", code: "INVALID_COOKIES_FILE" },
      { status: 422 }
    );
  }
  if (domainCount > MAX_DISTINCT_DOMAINS) {
    return NextResponse.json(
      {
        error: `El archivo contiene cookies de ${domainCount} sitios distintos — exporta solo el sitio que necesitas (ej. youtube.com), no todo el navegador.`,
        code: "TOO_MANY_DOMAINS",
      },
      { status: 422 }
    );
  }

  fs.mkdirSync(CONFIG.media.dataDir, { recursive: true });
  const targetPath = cookiesFilePath();
  fs.writeFileSync(targetPath, text, { mode: 0o600 });
  try {
    fs.chmodSync(targetPath, 0o600);
  } catch {
    // Best-effort on platforms without POSIX permissions (Windows)
  }

  return NextResponse.json({ ok: true, domainCount });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse();
  const targetPath = cookiesFilePath();
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath);
  }
  return NextResponse.json({ ok: true });
}
