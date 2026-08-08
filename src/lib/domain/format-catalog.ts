// Format Catalog — SINGLE SOURCE OF TRUTH for all format definitions.
// Every extension, MIME type, and format property must be defined here once.
// All other modules import from this catalog; no duplicate lists allowed.

import type { FileCategory } from "./descriptors";
import type { EngineId, MobilePortability } from "./engines";

// ── Format Definition ────────────────────────────────────────────────────────

export interface FormatDefinition {
  /** Unique format identifier (e.g., "markdown", "html", "docx", "mp3", "mp4") */
  id: string;
  /** Category this format belongs to */
  category: FileCategory;
  /** All input extensions that map to this format (e.g., ["md", "markdown"]) */
  inputExtensions: string[];
  /** The canonical output extension (e.g., "md") */
  outputExtension: string;
  /** MIME type(s) for this format, primary first */
  mimeTypes: string[];
  /** Operations possible on this format (e.g., ["transcode-audio", "normalize-audio"]) */
  operations: string[];
  /** Preferred engine for handling this format */
  preferredEngineId: EngineId;
  /** Whether this format supports in-browser preview */
  supportsPreview: boolean;
  /** Whether batch processing is supported */
  supportsBatch: boolean;
  /** Applicable limits */
  limits: FormatLimits;
  /** Mobile portability classification */
  mobilePortability: MobilePortability;
  /** Whether this format is experimental / not fully tested */
  experimental: boolean;
}

export interface FormatLimits {
  /** Maximum input file size in bytes (null = no specific limit beyond global) */
  maxInputSizeBytes: number | null;
  /** Maximum pages for documents (null = no limit) */
  maxPages: number | null;
  /** Maximum duration in seconds for media (null = no limit) */
  maxDurationSeconds: number | null;
}

// ── All Format Definitions ───────────────────────────────────────────────────

const FORMAT_CATALOG: FormatDefinition[] = [
  // ── Audio ──────────────────────────────────────────────────────────────────
  {
    id: "mp3",
    category: "audio",
    inputExtensions: ["mp3"],
    outputExtension: "mp3",
    mimeTypes: ["audio/mpeg"],
    operations: ["transcode-audio", "normalize-audio"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "m4a",
    category: "audio",
    inputExtensions: ["m4a"],
    outputExtension: "m4a",
    mimeTypes: ["audio/mp4", "audio/x-m4a"],
    operations: ["transcode-audio", "normalize-audio"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "wav",
    category: "audio",
    inputExtensions: ["wav"],
    outputExtension: "wav",
    mimeTypes: ["audio/wav", "audio/x-wav"],
    operations: ["transcode-audio", "normalize-audio"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 4 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "flac",
    category: "audio",
    inputExtensions: ["flac"],
    outputExtension: "flac",
    mimeTypes: ["audio/flac"],
    operations: ["transcode-audio", "normalize-audio"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 4 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "ogg",
    category: "audio",
    inputExtensions: ["ogg"],
    outputExtension: "ogg",
    mimeTypes: ["audio/ogg", "application/ogg"],
    operations: ["transcode-audio", "normalize-audio"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "aac",
    category: "audio",
    inputExtensions: ["aac"],
    outputExtension: "aac",
    mimeTypes: ["audio/aac", "audio/x-aac"],
    operations: ["transcode-audio", "normalize-audio"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },

  // ── Video ──────────────────────────────────────────────────────────────────
  {
    id: "mp4",
    category: "video",
    inputExtensions: ["mp4"],
    outputExtension: "mp4",
    mimeTypes: ["video/mp4"],
    operations: ["transcode-video", "extract-audio", "create-gif", "extract-thumbnail", "remux"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "webm",
    category: "video",
    inputExtensions: ["webm"],
    outputExtension: "webm",
    mimeTypes: ["video/webm"],
    operations: ["transcode-video", "extract-audio", "create-gif", "extract-thumbnail", "remux"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "mkv",
    category: "video",
    inputExtensions: ["mkv"],
    outputExtension: "mkv",
    mimeTypes: ["video/x-matroska"],
    operations: ["transcode-video", "extract-audio", "create-gif", "extract-thumbnail", "remux"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "avi",
    category: "video",
    inputExtensions: ["avi"],
    outputExtension: "avi",
    mimeTypes: ["video/x-msvideo"],
    operations: ["transcode-video", "extract-audio", "create-gif", "extract-thumbnail"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "mov",
    category: "video",
    inputExtensions: ["mov"],
    outputExtension: "mov",
    mimeTypes: ["video/quicktime"],
    operations: ["transcode-video", "extract-audio", "create-gif", "extract-thumbnail"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "wmv",
    category: "video",
    inputExtensions: ["wmv"],
    outputExtension: "wmv",
    mimeTypes: ["video/x-ms-wmv"],
    operations: ["transcode-video", "extract-audio", "create-gif", "extract-thumbnail"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: true,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "ts",
    category: "video",
    inputExtensions: ["ts"],
    outputExtension: "ts",
    mimeTypes: ["video/mp2t"],
    operations: ["transcode-video", "extract-audio", "remux"],
    preferredEngineId: "ffmpeg-media",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },

  // ── Image ──────────────────────────────────────────────────────────────────
  {
    id: "jpeg",
    category: "image",
    inputExtensions: ["jpg", "jpeg"],
    outputExtension: "jpg",
    mimeTypes: ["image/jpeg"],
    operations: ["convert-image", "resize-image"],
    preferredEngineId: "sharp-image",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "png",
    category: "image",
    inputExtensions: ["png"],
    outputExtension: "png",
    mimeTypes: ["image/png"],
    operations: ["convert-image", "resize-image"],
    preferredEngineId: "sharp-image",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "webp",
    category: "image",
    inputExtensions: ["webp"],
    outputExtension: "webp",
    mimeTypes: ["image/webp"],
    operations: ["convert-image", "resize-image"],
    preferredEngineId: "sharp-image",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "avif",
    category: "image",
    inputExtensions: ["avif"],
    outputExtension: "avif",
    mimeTypes: ["image/avif"],
    operations: ["convert-image", "resize-image"],
    preferredEngineId: "sharp-image",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "tiff",
    category: "image",
    inputExtensions: ["tiff", "tif"],
    outputExtension: "tiff",
    mimeTypes: ["image/tiff"],
    operations: ["convert-image", "resize-image"],
    preferredEngineId: "sharp-image",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "desktop-only",
    experimental: false,
  },
  {
    id: "gif",
    category: "image",
    inputExtensions: ["gif"],
    outputExtension: "gif",
    mimeTypes: ["image/gif"],
    operations: ["convert-image", "resize-image"],
    preferredEngineId: "sharp-image",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 200 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },

  // ── Document ───────────────────────────────────────────────────────────────
  {
    id: "docx",
    category: "document",
    inputExtensions: ["docx"],
    outputExtension: "docx",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    operations: ["convert-document"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: 500, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "doc",
    category: "document",
    inputExtensions: ["doc"],
    outputExtension: "doc",
    mimeTypes: ["application/msword"],
    operations: ["convert-document"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: 500, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "odt",
    category: "document",
    inputExtensions: ["odt"],
    outputExtension: "odt",
    mimeTypes: ["application/vnd.oasis.opendocument.text"],
    operations: ["convert-document"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: 500, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "rtf",
    category: "document",
    inputExtensions: ["rtf"],
    outputExtension: "rtf",
    mimeTypes: ["application/rtf", "text/rtf"],
    operations: ["convert-document"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 200 * 1024 ** 2, maxPages: 200, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },

  // ── Spreadsheet ────────────────────────────────────────────────────────────
  {
    id: "xlsx",
    category: "spreadsheet",
    inputExtensions: ["xlsx"],
    outputExtension: "xlsx",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    operations: ["convert-spreadsheet"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "xls",
    category: "spreadsheet",
    inputExtensions: ["xls"],
    outputExtension: "xls",
    mimeTypes: ["application/vnd.ms-excel"],
    operations: ["convert-spreadsheet"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "ods",
    category: "spreadsheet",
    inputExtensions: ["ods"],
    outputExtension: "ods",
    mimeTypes: ["application/vnd.oasis.opendocument.spreadsheet"],
    operations: ["convert-spreadsheet"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },

  // ── Presentation ───────────────────────────────────────────────────────────
  {
    id: "pptx",
    category: "presentation",
    inputExtensions: ["pptx"],
    outputExtension: "pptx",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    operations: ["convert-presentation"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: 200, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "ppt",
    category: "presentation",
    inputExtensions: ["ppt"],
    outputExtension: "ppt",
    mimeTypes: ["application/vnd.ms-powerpoint"],
    operations: ["convert-presentation"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: 200, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "odp",
    category: "presentation",
    inputExtensions: ["odp"],
    outputExtension: "odp",
    mimeTypes: ["application/vnd.oasis.opendocument.presentation"],
    operations: ["convert-presentation"],
    preferredEngineId: "libreoffice",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: 200, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },

  // ── PDF ────────────────────────────────────────────────────────────────────
  {
    id: "pdf",
    category: "pdf",
    inputExtensions: ["pdf"],
    outputExtension: "pdf",
    mimeTypes: ["application/pdf"],
    operations: ["merge-pdf", "split-pdf", "linearize-pdf", "rotate-pdf"],
    preferredEngineId: "qpdf",
    supportsPreview: true,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 2 * 1024 ** 3, maxPages: 5000, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },

  // ── Ebook ──────────────────────────────────────────────────────────────────
  {
    id: "epub",
    category: "ebook",
    inputExtensions: ["epub"],
    outputExtension: "epub",
    mimeTypes: ["application/epub+zip"],
    operations: ["convert-ebook"],
    preferredEngineId: "calibre",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 200 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "mobi",
    category: "ebook",
    inputExtensions: ["mobi"],
    outputExtension: "mobi",
    mimeTypes: ["application/x-mobipocket-ebook"],
    operations: ["convert-ebook"],
    preferredEngineId: "calibre",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 200 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "azw3",
    category: "ebook",
    inputExtensions: ["azw3"],
    outputExtension: "azw3",
    mimeTypes: ["application/vnd.amazon.ebook"],
    operations: ["convert-ebook"],
    preferredEngineId: "calibre",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 200 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: true,
  },

  // ── Archive ────────────────────────────────────────────────────────────────
  {
    id: "zip",
    category: "archive",
    inputExtensions: ["zip"],
    outputExtension: "zip",
    mimeTypes: ["application/zip"],
    operations: ["extract-archive", "list-archive"],
    preferredEngineId: "sevenzip",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 4 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "7z",
    category: "archive",
    inputExtensions: ["7z"],
    outputExtension: "7z",
    mimeTypes: ["application/x-7z-compressed"],
    operations: ["extract-archive", "list-archive"],
    preferredEngineId: "sevenzip",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 4 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "replace-adapter-on-mobile",
    experimental: false,
  },
  {
    id: "tar",
    category: "archive",
    inputExtensions: ["tar"],
    outputExtension: "tar",
    mimeTypes: ["application/x-tar"],
    operations: ["extract-archive", "list-archive"],
    preferredEngineId: "sevenzip",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 4 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "gz",
    category: "archive",
    inputExtensions: ["gz"],
    outputExtension: "gz",
    mimeTypes: ["application/gzip", "application/x-gzip"],
    operations: ["extract-archive", "list-archive"],
    preferredEngineId: "sevenzip",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 4 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "bz2",
    category: "archive",
    inputExtensions: ["bz2"],
    outputExtension: "bz2",
    mimeTypes: ["application/x-bzip2"],
    operations: ["extract-archive", "list-archive"],
    preferredEngineId: "sevenzip",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 4 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "xz",
    category: "archive",
    inputExtensions: ["xz"],
    outputExtension: "xz",
    mimeTypes: ["application/x-xz"],
    operations: ["extract-archive", "list-archive"],
    preferredEngineId: "sevenzip",
    supportsPreview: false,
    supportsBatch: false,
    limits: { maxInputSizeBytes: 4 * 1024 ** 3, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },

  // ── Structured Data ────────────────────────────────────────────────────────
  {
    id: "json",
    category: "structured-data",
    inputExtensions: ["json"],
    outputExtension: "json",
    mimeTypes: ["application/json"],
    operations: ["convert-data"],
    preferredEngineId: "data-ts",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 100 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "yaml",
    category: "structured-data",
    inputExtensions: ["yaml", "yml"],
    outputExtension: "yaml",
    mimeTypes: ["application/yaml", "text/yaml"],
    operations: ["convert-data"],
    preferredEngineId: "data-ts",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 100 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "toml",
    category: "structured-data",
    inputExtensions: ["toml"],
    outputExtension: "toml",
    mimeTypes: ["application/toml"],
    operations: ["convert-data"],
    preferredEngineId: "data-ts",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 100 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "xml",
    category: "structured-data",
    inputExtensions: ["xml"],
    outputExtension: "xml",
    mimeTypes: ["application/xml", "text/xml"],
    operations: ["convert-data"],
    preferredEngineId: "data-ts",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 100 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "csv",
    category: "structured-data",
    inputExtensions: ["csv"],
    outputExtension: "csv",
    mimeTypes: ["text/csv"],
    operations: ["convert-data"],
    preferredEngineId: "data-ts",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "tsv",
    category: "structured-data",
    inputExtensions: ["tsv"],
    outputExtension: "tsv",
    mimeTypes: ["text/tab-separated-values"],
    operations: ["convert-data"],
    preferredEngineId: "data-ts",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 500 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },

  // ── Plain Text ─────────────────────────────────────────────────────────────
  {
    id: "markdown",
    category: "plain-text",
    inputExtensions: ["md", "markdown"],
    outputExtension: "md",
    mimeTypes: ["text/markdown"],
    operations: ["convert-text"],
    preferredEngineId: "pandoc",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 50 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "txt",
    category: "plain-text",
    inputExtensions: ["txt"],
    outputExtension: "txt",
    mimeTypes: ["text/plain"],
    operations: ["convert-text"],
    preferredEngineId: "pandoc",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 50 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "html",
    category: "plain-text",
    inputExtensions: ["html", "htm"],
    outputExtension: "html",
    mimeTypes: ["text/html"],
    operations: ["convert-text"],
    preferredEngineId: "pandoc",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 50 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "rst",
    category: "plain-text",
    inputExtensions: ["rst"],
    outputExtension: "rst",
    mimeTypes: ["text/x-rst"],
    operations: ["convert-text"],
    preferredEngineId: "pandoc",
    supportsPreview: true,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 50 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "portable-domain",
    experimental: false,
  },
  {
    id: "tex",
    category: "plain-text",
    inputExtensions: ["tex", "latex"],
    outputExtension: "tex",
    mimeTypes: ["application/x-tex", "text/x-tex"],
    operations: ["convert-text"],
    preferredEngineId: "pandoc",
    supportsPreview: false,
    supportsBatch: true,
    limits: { maxInputSizeBytes: 50 * 1024 ** 2, maxPages: null, maxDurationSeconds: null },
    mobilePortability: "desktop-only",
    experimental: true,
  },
];

// ── Derived lookups ───────────────────────────────────────────────────────────

/** Set of every extension allowed as input (derived from all inputExtensions) */
export const ALL_ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set(
  FORMAT_CATALOG.flatMap((f) => f.inputExtensions)
);

/** HTML input accept attribute string (e.g., ".mp3,.m4a,.wav,...") */
export const INPUT_ACCEPT_ATTR: string = FORMAT_CATALOG.flatMap((f) =>
  f.inputExtensions.map((ext) => `.${ext}`)
).join(",");

/** Map of category → format definitions */
export const FORMATS_BY_CATEGORY: ReadonlyMap<FileCategory, FormatDefinition[]> = (() => {
  const map = new Map<FileCategory, FormatDefinition[]>();
  for (const fmt of FORMAT_CATALOG) {
    const list = map.get(fmt.category) ?? [];
    list.push(fmt);
    map.set(fmt.category, list);
  }
  return map;
})();

/** Map of extension → format definition (lowercase) */
export const FORMAT_BY_EXTENSION: ReadonlyMap<string, FormatDefinition> = (() => {
  const map = new Map<string, FormatDefinition>();
  for (const fmt of FORMAT_CATALOG) {
    for (const ext of fmt.inputExtensions) {
      map.set(ext, fmt);
    }
  }
  return map;
})();

/** Map of primary MIME type → format definition */
export const MIME_TO_FORMAT: ReadonlyMap<string, FormatDefinition> = (() => {
  const map = new Map<string, FormatDefinition>();
  for (const fmt of FORMAT_CATALOG) {
    for (const mime of fmt.mimeTypes) {
      if (!map.has(mime)) {
        map.set(mime, fmt);
      }
    }
  }
  return map;
})();

/** The raw catalog array for direct iteration if needed */
export { FORMAT_CATALOG };
