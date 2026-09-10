import { describe, expect, it } from "vitest";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const scriptPath = path.resolve(__dirname, "../../scripts/lib/sanitize-required-server-files.py");

function createSampleManifest(workspacePath: string, useWindowsSlashes = false): Record<string, unknown> {
  const root = useWindowsSlashes ? workspacePath.replace(/\//g, "\\") : workspacePath;
  return {
    version: 1,
    config: {
      distDir: ".next",
      cleanDistDir: true,
      outputFileTracingRoot: root,
      repoRoot: root,
      turbopack: {
        root: root,
      },
      distDirRoot: ".next",
    },
    appDir: root,
    relativeAppDir: "",
    files: [
      ".next/package.json",
      ".next/routes-manifest.json",
      ".next/server/pages-manifest.json",
      ".next/build-manifest.json",
      ".next/required-server-files.json",
    ],
    ignore: [],
  };
}

describe("sanitize-required-server-files.py", () => {
  const platforms = [
    {
      name: "Linux runner",
      workspace: "/home/runner/work/anclora-filestudio/anclora-filestudio",
      windowsSlashes: false,
    },
    {
      name: "macOS runner",
      workspace: "/Users/runner/work/anclora-filestudio/anclora-filestudio",
      windowsSlashes: false,
    },
    {
      name: "Mac Toni",
      workspace: "/Users/toni/Developer/anclora/anclora-filestudio",
      windowsSlashes: false,
    },
    {
      name: "Windows runner (forward slash)",
      workspace: "D:/a/anclora-filestudio/anclora-filestudio",
      windowsSlashes: false,
    },
    {
      name: "Windows runner (backslash)",
      workspace: "D:\\a\\anclora-filestudio\\anclora-filestudio",
      windowsSlashes: true,
    },
  ];

  for (const { name, workspace, windowsSlashes } of platforms) {
    it(`sanitizes required-server-files.json for ${name} correctly and without path leaks`, () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rsf-test-"));
      const manifestPath = path.join(tempDir, "required-server-files.json");
      const manifest = createSampleManifest(workspace, windowsSlashes);

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

      execFileSync("python3", [scriptPath, manifestPath, workspace], {
        encoding: "utf8",
      });

      const raw = fs.readFileSync(manifestPath, "utf8");
      const sanitized = JSON.parse(raw);

      // 1. JSON parseable
      expect(sanitized).toBeDefined();

      // 2. No build workspace leak
      const rawLower = raw.toLowerCase();
      const posixNorm = workspace.replace(/\\/g, "/").toLowerCase();
      const winNorm = posixNorm.replace(/\//g, "\\");
      expect(rawLower.includes(posixNorm)).toBe(false);
      expect(rawLower.includes(winNorm)).toBe(false);

      // 3. Sanitized fields point to portable root
      expect(sanitized.appDir).toBe(".");
      expect(sanitized.config.outputFileTracingRoot).toBe(".");
      expect(sanitized.config.repoRoot).toBe(".");
      expect(sanitized.config.turbopack.root).toBe(".");

      // 4. Runtime-essential fields preserved
      expect(sanitized.version).toBe(1);
      expect(sanitized.files).toContain(".next/routes-manifest.json");
      expect(sanitized.config.distDir).toBe(".next");

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  }

  it("sanitizes server.js correctly across path styles and casing", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "server-test-"));
    const serverPath = path.join(tempDir, "server.js");
    const workspace = "/Users/toni/Developer/anclora/anclora-filestudio";

    const content = `
const nextConfig = {"outputFileTracingRoot":"${workspace}","repoRoot":"${workspace}","turbopack":{"root":"${workspace}"}}
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)
`;

    fs.writeFileSync(serverPath, content, "utf8");

    // Pass lowercase version to test case-insensitivity tolerance
    execFileSync("python3", [scriptPath, "--server-js", serverPath, "/Users/toni/developer/anclora/anclora-filestudio"], {
      encoding: "utf8",
    });

    const sanitized = fs.readFileSync(serverPath, "utf8");
    expect(sanitized).not.toContain(workspace);
    expect(sanitized).toContain('"outputFileTracingRoot":"."');
    expect(sanitized).toContain('"repoRoot":"."');
    expect(sanitized).toContain('"turbopack":{"root":"."}');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
