import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { executeWorkerConversion } from "../src/worker.js";

describe("executeWorkerConversion", () => {
  it("keeps data conversions intact", async () => {
    const dir = await mkdtemp(join(tmpdir(), "worker-data-"));
    const inputPath = join(dir, "input.json");
    const outputPath = join(dir, "output.yaml");
    await writeFile(inputPath, JSON.stringify({ ok: true }));

    await executeWorkerConversion({
      operation: "data.json-to-yaml",
      inputPath,
      outputPath,
      options: {},
    });

    await expect(readFile(outputPath, "utf8")).resolves.toContain("ok: true");
  });

  it("resizes images with sharp", async () => {
    const dir = await mkdtemp(join(tmpdir(), "worker-image-"));
    const inputPath = join(dir, "input.png");
    const outputPath = join(dir, "output.webp");
    await sharp({
      create: {
        width: 300,
        height: 150,
        channels: 3,
        background: { r: 74, g: 159, b: 216 },
      },
    }).png().toFile(inputPath);

    await executeWorkerConversion({
      operation: "image:resize",
      inputPath,
      outputPath,
      options: { width: 100, outputFormat: "webp", fit: "inside", quality: 80 },
    });

    const metadata = await sharp(outputPath).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(50);
    expect(metadata.exif).toBeUndefined();
  });

  it("fails before execution for unavailable operations", async () => {
    await expect(executeWorkerConversion({
      operation: "video:download",
      inputPath: "/tmp/missing",
      outputPath: "/tmp/missing.out",
      options: {},
    })).rejects.toThrow("OPERATION_UNAVAILABLE");
  });
});
