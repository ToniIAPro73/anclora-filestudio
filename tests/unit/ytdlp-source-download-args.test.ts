// Unit tests for buildYtdlpSourceDownloadArgs (two-stage download args).
// The SOURCE format selector and the OUTPUT format are decoupled: this
// builder only ever describes the source, never --extract-audio.

import { describe, it, expect } from "vitest";
import { buildYtdlpSourceDownloadArgs } from "../../src/lib/media/command-builder";

const URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

describe("buildYtdlpSourceDownloadArgs", () => {
  it("builds source-download args: --format selector + --output template, no --extract-audio", () => {
    const args = buildYtdlpSourceDownloadArgs({
      url: URL,
      formatSelector: "bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio",
      outputTemplate: "/tmp/job/source.%(ext)s",
    });
    expect(args).toContain("--format");
    expect(args).toContain("bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio");
    expect(args).toContain("--output");
    expect(args).toContain("/tmp/job/source.%(ext)s");
    expect(args).not.toContain("--extract-audio");
    // Node/EJS must be available on the anonymous source download too.
    expect(args).toContain("--js-runtimes");
    expect(args).not.toContain("--cookies");
  });

  it("adds --merge-output-format when a merge container is provided", () => {
    const args = buildYtdlpSourceDownloadArgs({
      url: URL,
      formatSelector: "bestvideo*[height=1080]+bestaudio",
      outputTemplate: "/tmp/job/source.%(ext)s",
      mergeFormat: "mkv",
    });
    expect(args).toContain("--merge-output-format");
    expect(args).toContain("mkv");
  });

  it("adds --embed-metadata only when requested (pristine audio sources by default)", () => {
    const withMeta = buildYtdlpSourceDownloadArgs({
      url: URL,
      formatSelector: "bestaudio",
      outputTemplate: "/tmp/s.%(ext)s",
      embedMetadata: true,
    });
    expect(withMeta).toContain("--embed-metadata");

    const without = buildYtdlpSourceDownloadArgs({
      url: URL,
      formatSelector: "bestaudio",
      outputTemplate: "/tmp/s.%(ext)s",
    });
    expect(without).not.toContain("--embed-metadata");
  });

  it("keeps --no-playlist/--newline and the URL last", () => {
    const args = buildYtdlpSourceDownloadArgs({
      url: URL,
      formatSelector: "bestaudio",
      outputTemplate: "/tmp/s.%(ext)s",
    });
    expect(args).toContain("--no-playlist");
    expect(args).toContain("--newline");
    expect(args[args.length - 1]).toBe(URL);
  });
});