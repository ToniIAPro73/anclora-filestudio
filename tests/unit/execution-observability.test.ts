import { describe, expect, it } from "vitest";
import {
  classifyExecutionError,
  mapAppErrorCode,
  redactPathLike,
  serializeExecutionError,
  truncateTail,
} from "../../src/lib/jobs/execution-observability";

describe("execution observability error taxonomy", () => {
  it("classifies recoverable technical failures", () => {
    expect(classifyExecutionError("ENGINE_TIMEOUT")).toBe("RECOVERABLE_TECHNICAL");
    expect(classifyExecutionError("ENGINE_CRASH")).toBe("RECOVERABLE_TECHNICAL");
    expect(classifyExecutionError("PROCESS_EXIT_NONZERO")).toBe("RECOVERABLE_TECHNICAL");
  });

  it("classifies content and policy failures as non-recoverable", () => {
    expect(classifyExecutionError("SOURCE_MISMATCH")).toBe("NON_RECOVERABLE_CONTENT");
    expect(classifyExecutionError("CORRUPT_INPUT")).toBe("NON_RECOVERABLE_CONTENT");
    expect(classifyExecutionError("SCANNED_CONTENT_REQUIRES_OCR")).toBe("NON_RECOVERABLE_CONTENT");
    expect(classifyExecutionError("SECURITY_POLICY_BLOCKED")).toBe("NON_RECOVERABLE_POLICY");
  });

  it("classifies runtime/user-action/cancelled/unknown distinctly", () => {
    expect(classifyExecutionError("RUNTIME_PACK_REQUIRED")).toBe("USER_ACTION_REQUIRED");
    expect(classifyExecutionError("ENGINE_UNAVAILABLE")).toBe("USER_ACTION_REQUIRED");
    expect(classifyExecutionError("USER_CANCELLED")).toBe("CANCELLED");
    expect(classifyExecutionError("UNKNOWN")).toBe("UNKNOWN");
  });

  it("maps app-level errors to execution taxonomy", () => {
    expect(mapAppErrorCode("PROCESS_TIMEOUT")).toBe("ENGINE_TIMEOUT");
    expect(mapAppErrorCode("INPUT_CORRUPTED")).toBe("CORRUPT_INPUT");
    expect(mapAppErrorCode("UNSAFE_PATH")).toBe("SECURITY_POLICY_BLOCKED");
    expect(mapAppErrorCode("RUNTIME_PACK_REQUIRED")).toBe("RUNTIME_PACK_REQUIRED");
  });

  it("detects scanned OCR and timeout details without engine-specific policy", () => {
    expect(mapAppErrorCode("ENGINE_EXECUTE_FAILED", "PDF → ODT editable requiere OCR")).toBe("SCANNED_CONTENT_REQUIRES_OCR");
    expect(mapAppErrorCode("ENGINE_EXECUTE_FAILED", "process timeout SIGKILL")).toBe("ENGINE_TIMEOUT");
  });
});

describe("safe execution error serialization", () => {
  it("redacts path-like values and query secrets", () => {
    const redacted = redactPathLike("/home/toni/private/input.pdf?token=abc user@example.com C:\\Users\\Toni\\file.docx");
    expect(redacted).not.toContain("/home/toni/private");
    expect(redacted).not.toContain("abc");
    expect(redacted).not.toContain("user@example.com");
    expect(redacted).toContain("[redacted-email]");
  });

  it("truncates stderr from the tail", () => {
    const text = `start-${"x".repeat(5000)}-tail`;
    const tail = truncateTail(text, 20);
    expect(tail.length).toBe(20);
    expect(tail.endsWith("-tail")).toBe(true);
  });

  it("serializes errors without stacks or giant logs", () => {
    const error = new Error("failed at /home/toni/secrets/input.pdf");
    const serialized = serializeExecutionError({
      error,
      code: "ENGINE_TIMEOUT",
      logs: [`${"a".repeat(5000)}token=secret`],
      engineId: "pandoc",
    });
    expect(serialized.code).toBe("ENGINE_TIMEOUT");
    expect(serialized.class).toBe("RECOVERABLE_TECHNICAL");
    expect(serialized.messageSafe).not.toContain("/home/toni/secrets");
    expect(serialized.stderrTail?.length).toBeLessThanOrEqual(4000);
    expect(JSON.stringify(serialized)).not.toContain("stack");
  });
});
