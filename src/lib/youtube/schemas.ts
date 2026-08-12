import { z } from "zod";
import { VideoQualitySelectionSchema } from "../quality/quality-contract";

export const MetadataRequestSchema = z.object({
  url: z.string().trim().url(),
});

export const VideoFormatSchema = z.object({
  formatId: z.string(),
  protocol: z.string().nullable().optional(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  fps: z.number().nullable(),
  ext: z.string(),
  vcodec: z.string().nullable(),
  acodec: z.string().nullable(),
  isVideoOnly: z.boolean(),
  isAudioOnly: z.boolean().optional(),
  fileSizeBytes: z.number().nullable(),
  fileSizeApproxBytes: z.number().nullable(),
  tbr: z.number().nullable(),
  vbr: z.number().nullable().optional(),
  abr: z.number().nullable().optional(),
});

export const AudioFormatSchema = z.object({
  formatId: z.string(),
  protocol: z.string().nullable().optional(),
  ext: z.string(),
  acodec: z.string().nullable(),
  abr: z.number().nullable(),
  sampleRate: z.number().nullable(),
  channels: z.number().nullable(),
  fileSizeBytes: z.number().nullable(),
  fileSizeApproxBytes: z.number().nullable(),
  tbr: z.number().nullable(),
  hasAudio: z.boolean(),
});

export const MetadataResponseSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channel: z.string(),
  thumbnailUrl: z.string().url(),
  durationSeconds: z.number(),
  durationLabel: z.string(),
  availableHeights: z.array(z.number()),
  supported: z.boolean(),
  videoFormats: z.array(VideoFormatSchema).default([]),
  audioFormats: z.array(AudioFormatSchema).optional(),
});

export const JobRequestSchema = z.object({
  videoId: z.string().length(11),
  format: z.enum(["mp3", "mp4"]),
  quality: z.union([z.string(), VideoQualitySelectionSchema]),
  rightsConfirmed: z.boolean().refine(val => val === true, {
    message: "Debes confirmar que tienes los derechos para descargar este contenido.",
  }),
});

export type MetadataRequest = z.infer<typeof MetadataRequestSchema>;
export type MetadataResponse = z.infer<typeof MetadataResponseSchema>;
export type JobRequest = z.infer<typeof JobRequestSchema>;
