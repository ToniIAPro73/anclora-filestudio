// Desktop-only "Vídeo y Audio -> Desde URL" caption probe. Read-only and
// fast (a single `yt-dlp --skip-download -J`) — deliberately NOT a job:
// the actual download/transcription work (which can be slow and must be
// cancellable) is handled by the job system, see
// src/lib/jobs/url-transcript-processor.ts.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeYoutubeUrl } from "@/lib/youtube/normalize-url";
import { probeUrlCaptions } from "@/lib/media/ytdlp-subtitles";

const BodySchema = z.object({ url: z.string().min(1) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud no válida.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const normalizedUrl = normalizeYoutubeUrl(parsed.data.url) ?? parsed.data.url;
  if (!/^https:\/\//i.test(normalizedUrl)) {
    return NextResponse.json({ error: "Este enlace no es compatible.", code: "UNSUPPORTED_URL" }, { status: 400 });
  }

  try {
    const info = await probeUrlCaptions(normalizedUrl);
    return NextResponse.json(info);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ error: message.slice(0, 300), code: "UNSUPPORTED_URL" }, { status: 502 });
  }
}
