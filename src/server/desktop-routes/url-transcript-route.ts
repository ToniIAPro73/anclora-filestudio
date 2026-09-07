// Desktop-only "Vídeo y Audio -> Desde URL" endpoint.
// Synchronous by design (no job/queue): caption lookup and conversion are
// fast; the Whisper fallback for URLs without captions can take longer but
// still returns a single response — no progress/cancel UI for this path
// (unlike the local-file flow, which runs through the full job pipeline).
//
// Actions:
//   probe      -> list manual/automatic caption availability for a URL
//   subtitle   -> download+convert one caption track to txt/md/srt/vtt
//   transcribe -> no captions available: yt-dlp audio-only -> whisper-cli

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { z } from "zod";
import { normalizeYoutubeUrl } from "@/lib/youtube/normalize-url";
import { probeUrlCaptions, downloadUrlSubtitle, downloadUrlAudioOnly } from "@/lib/media/ytdlp-subtitles";
import { runWhisperTranscription, parseSrt, buildTimestampedTxt, buildTranscriptMarkdown, type WhisperOutputFormat } from "@/lib/engines/media/whisper-engine";
import { findFfmpegBinary } from "@/lib/engines/media/ffmpeg-engine";
import { ProcessRunner } from "@/lib/infrastructure/processes/process-runner";
import { CONFIG } from "@/lib/config";
import { createAppError, ERROR_MESSAGES } from "@/lib/errors/error-codes";

const OUTPUT_MIME: Record<WhisperOutputFormat, string> = {
  txt: "text/plain", md: "text/markdown", srt: "application/x-subrip", vtt: "text/vtt",
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("probe"), url: z.string().min(1) }),
  z.object({
    action: z.literal("subtitle"),
    url: z.string().min(1),
    source: z.enum(["manual", "automatic"]),
    lang: z.string().min(1),
    outputFormat: z.enum(["txt", "md", "srt", "vtt"]),
    timestamps: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("transcribe"),
    url: z.string().min(1),
    language: z.string().optional(),
    outputFormat: z.enum(["txt", "md", "srt", "vtt"]),
    timestamps: z.boolean().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud no válida.", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  const data = parsed.data;

  const normalizedUrl = normalizeYoutubeUrl(data.url) ?? data.url;
  if (!/^https:\/\//i.test(normalizedUrl)) {
    return NextResponse.json({ error: ERROR_MESSAGES.UNSUPPORTED_URL, code: "UNSUPPORTED_URL" }, { status: 400 });
  }

  try {
    if (data.action === "probe") {
      const info = await probeUrlCaptions(normalizedUrl);
      return NextResponse.json(info);
    }

    // Both remaining actions produce a text artifact directly in the
    // response (no job/download-token indirection needed for small text).
    const workDir = path.join(os.tmpdir(), "anclora-filestudio-url-transcript", crypto.randomUUID());
    fs.mkdirSync(workDir, { recursive: true });

    try {
      if (data.action === "subtitle") {
        const downloaded = await downloadUrlSubtitle(normalizedUrl, data.lang, data.source, workDir);
        const srtContent = fs.readFileSync(downloaded.srtPath, "utf8");
        const segments = parseSrt(srtContent);
        const includeTimestamps = data.timestamps !== false;
        const content = await renderOutput(data.outputFormat, {
          srtContent,
          segments,
          includeTimestamps,
          meta: {
            title: normalizedUrl,
            source: normalizedUrl,
            durationLabel: "—",
            language: data.lang,
            processedAtIso: new Date().toISOString(),
          },
        });
        return NextResponse.json({ content, outputFormat: data.outputFormat, mimeType: OUTPUT_MIME[data.outputFormat] });
      }

      // action === "transcribe" — no captions, audio-only + Whisper
      const audioPath = path.join(workDir, "audio.wav");
      await downloadUrlAudioOnly(normalizedUrl, audioPath);
      const info = await probeUrlCaptions(normalizedUrl).catch(() => null);
      const whisperResult = await runWhisperTranscription(audioPath, {
        language: data.language || "auto",
        workDir,
        timeoutMs: CONFIG.media.limits.conversionTimeoutSeconds * 1000,
      });
      if (!whisperResult.success) {
        throw createAppError("TRANSCRIPTION_FAILED", ERROR_MESSAGES.TRANSCRIPTION_FAILED, {
          stage: "url-transcribe",
          engineId: "whisper-cli",
          technicalDetail: whisperResult.error,
        });
      }
      const includeTimestamps = data.timestamps !== false;
      const content = await renderOutput(data.outputFormat, {
        srtContent: whisperResult.srtContent,
        vttContent: whisperResult.vttContent,
        txtContent: whisperResult.txtContent,
        segments: whisperResult.segments,
        includeTimestamps,
        meta: {
          title: info?.title ?? normalizedUrl,
          source: normalizedUrl,
          durationLabel: formatDuration(info?.durationSeconds ?? null),
          language: (data.language || "auto") === "auto" ? "Detección automática" : (data.language as string),
          processedAtIso: new Date().toISOString(),
        },
      });
      return NextResponse.json({ content, outputFormat: data.outputFormat, mimeType: OUTPUT_MIME[data.outputFormat] });
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  } catch (error: unknown) {
    console.error("URL transcript API error:", error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ error: message.slice(0, 300), code: "TRANSCRIPTION_FAILED" }, { status: 500 });
  }
}

async function renderOutput(
  outputFormat: WhisperOutputFormat,
  ctx: {
    srtContent: string;
    vttContent?: string;
    txtContent?: string;
    segments: ReturnType<typeof parseSrt>;
    includeTimestamps: boolean;
    meta: { title: string; source: string; durationLabel: string; language: string; processedAtIso: string };
  }
): Promise<string> {
  switch (outputFormat) {
    case "srt":
      return ctx.srtContent;
    case "vtt":
      if (ctx.vttContent !== undefined) return ctx.vttContent;
      return convertSrtToVtt(ctx.srtContent);
    case "md":
      return buildTranscriptMarkdown(ctx.meta, ctx.segments, ctx.includeTimestamps);
    case "txt":
    default:
      if (ctx.includeTimestamps) return buildTimestampedTxt(ctx.segments);
      return ctx.txtContent !== undefined && ctx.txtContent.length > 0
        ? ctx.txtContent
        : ctx.segments.map((s) => s.text).join(" ");
  }
}

async function convertSrtToVtt(srtContent: string): Promise<string> {
  const tmp = path.join(os.tmpdir(), `anclora-srt2vtt-${crypto.randomUUID()}`);
  fs.mkdirSync(tmp, { recursive: true });
  const srtPath = path.join(tmp, "in.srt");
  const vttPath = path.join(tmp, "out.vtt");
  fs.writeFileSync(srtPath, srtContent, "utf8");
  try {
    const runner = new ProcessRunner(findFfmpegBinary(), 30_000);
    const result = await runner.run({ args: ["-y", "-i", srtPath, vttPath], timeoutMs: 30_000 });
    if (result.exitCode !== 0 || !fs.existsSync(vttPath)) return "";
    return fs.readFileSync(vttPath, "utf8");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
