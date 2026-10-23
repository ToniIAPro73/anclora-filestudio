import { chmod, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Fake yt-dlp/ffmpeg on PATH: exercises the real spawn/args/cancel/timeout code without network.
const JOB = "yt_123e4567-e89b-12d3-a456-426614174000";
let dir = "";
let originalPath = "";
let worker: typeof import("../src/worker.js");

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "yt-fake-bin-"));
  const script = `#!/bin/sh
case "$1" in --version) echo 2026.07.04; exit 0;; esac
echo "$@" > "${dir}/args.txt"
out=""; prev=""
for a in "$@"; do [ "$prev" = "--output" ] && out="$a"; prev="$a"; done
case "$*" in
  *MODE_FAIL_BLOCKED*) echo "ERROR: Sign in to confirm you're not a bot" >&2; exit 1;;
  *MODE_SLEEP*) exec sleep 30;;
esac
printf 'media' > "$out"
exit 0
`;
  for (const name of ["yt-dlp", "ffmpeg"]) {
    await writeFile(join(dir, name), name === "ffmpeg" ? "#!/bin/sh\necho ffmpeg\n" : script, { mode: 0o755 });
    await chmod(join(dir, name), 0o755);
  }
  originalPath = process.env.PATH ?? "";
  process.env.PATH = `${dir}:${originalPath}`;
  worker = await import("../src/worker.js");
});
afterAll(() => { process.env.PATH = originalPath; });

const base = (extra: Record<string, unknown>, url = "https://www.youtube.com/watch?v=5HaOxAAA5qI") => ({
  jobId: JOB, operation: "youtube:convert", inputPath: url, outputPath: join(dir, `${JOB}.mp4`), options: { format: "mp4", quality: "best", ...extra },
});

describe("youtube:convert executor", () => {
  it("runs yt-dlp anonymously with --ignore-config, a size cap and no cookie flags", async () => {
    const input = base({});
    await worker.executeWorkerConversion(input);
    const args = (await readFile(join(dir, "args.txt"), "utf8")).trim().split(" ");
    expect(args).toContain("--ignore-config");
    expect(args).toContain("--no-playlist");
    expect(args).toContain("--max-filesize");
    expect(args.join(" ")).not.toMatch(/cookie/i);
    expect(args.at(-1)).toBe(input.inputPath);
    expect((await stat(input.outputPath)).size).toBeGreaterThan(0);
  });

  it("builds an mp3 extraction command", async () => {
    await worker.executeWorkerConversion({ ...base({ format: "mp3" }), outputPath: join(dir, `${JOB}.mp3`) });
    const args = await readFile(join(dir, "args.txt"), "utf8");
    expect(args).toContain("--extract-audio --audio-format mp3");
  });

  it("rejects invalid format and quality before spawning", async () => {
    await expect(worker.executeWorkerConversion(base({ format: "mkv" }))).rejects.toThrow("VALIDATION_FAILED:format");
    await expect(worker.executeWorkerConversion(base({ quality: "1080p;rm -rf /" }))).rejects.toThrow("VALIDATION_FAILED:quality");
  });

  it("surfaces a classified anonymous-access error without raw stderr", async () => {
    await expect(worker.executeWorkerConversion(base({}, "https://www.youtube.com/watch?v=MODE_FAIL_BLOCKED"))).rejects.toThrow(/^YOUTUBE_ANONYMOUS_ACCESS_BLOCKED$/);
  });

  it("maps the configured timeout to YOUTUBE_TIMEOUT and kills the process", async () => {
    const started = Date.now();
    await expect(worker.executeWorkerConversion(base({ timeoutMs: 300 }, "https://www.youtube.com/watch?v=MODE_SLEEP"))).rejects.toThrow(/^YOUTUBE_TIMEOUT$/);
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it("cancels an active process by job id", async () => {
    const run = worker.executeWorkerConversion(base({}, "https://www.youtube.com/watch?v=MODE_SLEEP"));
    const settled = run.then(() => "ok", (error: Error) => error.message);
    await new Promise((resolve) => setTimeout(resolve, 300));
    worker.cancelYoutubeProcess(JOB);
    expect(await settled).toMatch(/^YOUTUBE_/);
  });
});
