/**
 * Regression test: a yt-dlp download/merge failure (not just the metadata
 * analyze path) must surface its classified, specific message — not the
 * generic "Error interno del procesador." fallback that silently discarded
 * it before this fix.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { EventEmitter } from "events";
import * as child_process from "child_process";

vi.mock("child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("child_process")>();
  return { ...original, spawn: vi.fn() };
});

vi.mock("fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("fs")>();
  const mocked = {
    ...original,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock("@/lib/media/metadata", () => ({
  getVideoMetadata: vi.fn().mockResolvedValue({
    videoId: "88fD-UtG_yo",
    title: "Test Video",
    channel: "Test Channel",
    thumbnailUrl: null,
    durationSeconds: 120,
    durationLabel: "2:00",
    availableHeights: [1080],
    supported: true,
    videoFormats: [],
    audioFormats: [],
  }),
}));

vi.mock("@/lib/jobs/disk-space-check", () => ({
  checkDiskSpace: vi.fn().mockResolvedValue({ sufficient: true, message: "" }),
}));

const updateJobMock = vi.fn();
const getJobMock = vi.fn();

vi.mock("@/lib/jobs/job-manager", () => ({
  jobManager: {
    getJob: (...args: unknown[]) => getJobMock(...args),
    updateJob: (...args: unknown[]) => updateJobMock(...args),
  },
}));

function makeFakeProcess() {
  const proc = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

describe("processJob — yt-dlp download failure surfaces the classified message", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the YouTube bot-check message, not the generic processor fallback", async () => {
    getJobMock.mockReturnValue({
      id: "job1",
      input_kind: "remote-url",
      input_reference: "https://youtu.be/88fD-UtG_yo",
      input_title: null,
      output_format: "mp4",
      quality: JSON.stringify({ profile: "source-max", resolutionLimit: "max", fallbackPolicy: "reject" }),
    });

    const spawnMock = vi.mocked(child_process.spawn);
    const proc = makeFakeProcess();
    spawnMock.mockReturnValue(proc as unknown as ReturnType<typeof child_process.spawn>);

    const { processJob } = await import("../../src/lib/media/processor");
    const jobPromise = processJob("job1");

    // Let the microtask queue advance past getVideoMetadata + disk check
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    proc.stderr.emit(
      "data",
      "ERROR: [youtube] 88fD-UtG_yo: Sign in to confirm you’re not a bot. Use --cookies-from-browser or --cookies\n"
    );
    proc.emit("close", 1);

    await jobPromise;

    const failedCall = updateJobMock.mock.calls.find(
      (call) => call[1]?.status === "failed"
    );
    expect(failedCall).toBeDefined();
    expect(failedCall![1].error_message).toContain("YouTube ha rechazado el análisis automático");
    expect(failedCall![1].error_message).not.toBe("Error interno del procesador.");
  });
});
