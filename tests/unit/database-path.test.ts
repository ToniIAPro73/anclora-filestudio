import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

describe("database path configuration", () => {
  const originalDataDir = process.env.ANCLORA_FILESTUDIO_DATA_DIR;

  afterEach(() => {
    if (originalDataDir === undefined) delete process.env.ANCLORA_FILESTUDIO_DATA_DIR;
    else process.env.ANCLORA_FILESTUDIO_DATA_DIR = originalDataDir;
    vi.resetModules();
  });

  it("honors the configured portable data directory and never falls back to app/data", async () => {
    const portableDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "filestudio-portable-data-"));
    process.env.ANCLORA_FILESTUDIO_DATA_DIR = portableDataDir;
    vi.resetModules();

    const { getDb, getDbPath } = await import("../../src/lib/infrastructure/db/database");
    const expectedDbPath = path.join(path.resolve(portableDataDir), "anclora-filestudio.sqlite");

    expect(getDbPath()).toBe(expectedDbPath);
    const db = getDb();
    db.close();
    expect(fs.existsSync(expectedDbPath)).toBe(true);
    expect(getDbPath()).not.toBe(path.resolve(process.cwd(), "app", "data", "anclora-filestudio.sqlite"));

    fs.rmSync(portableDataDir, { recursive: true, force: true });
  });
});
