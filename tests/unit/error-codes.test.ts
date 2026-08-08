// Unit tests for the unified error code system.

import { describe, it, expect } from "vitest";
import {
  createAppError,
  isRetryable,
  ERROR_MESSAGES,
  type ErrorCode,
} from "../../src/lib/errors/error-codes";

describe("Error Codes — createAppError", () => {
  it("creates an AppError with required fields", () => {
    const err = createAppError("JOB_NOT_FOUND", "Job xyz not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
    expect(err.code).toBe("JOB_NOT_FOUND");
    expect(err.message).toBe("Job xyz not found");
    expect(err.stage).toBe("unknown");
    expect(err.retryable).toBe(false);
    expect(err.engineId).toBeUndefined();
    expect(err.technicalDetail).toBeUndefined();
    expect(err.cause).toBeUndefined();
  });

  it("creates an AppError with all options", () => {
    const cause = new Error("original cause");
    const err = createAppError("ENGINE_EXECUTE_FAILED", "Engine failed", {
      stage: "execution",
      engineId: "sharp-image",
      retryable: true,
      technicalDetail: "exit code 1",
      cause,
    });
    expect(err.code).toBe("ENGINE_EXECUTE_FAILED");
    expect(err.stage).toBe("execution");
    expect(err.engineId).toBe("sharp-image");
    expect(err.retryable).toBe(true);
    expect(err.technicalDetail).toBe("exit code 1");
    expect(err.cause).toBe(cause);
  });

  it("defaults stage to 'unknown' when not provided", () => {
    const err = createAppError("INPUT_NOT_FOUND", "Input missing");
    expect(err.stage).toBe("unknown");
  });

  it("uses provided stage over default", () => {
    const err = createAppError("VALIDATION_FAILED", "Bad output", { stage: "validation" });
    expect(err.stage).toBe("validation");
  });
});

describe("Error Codes — retryable defaults", () => {
  const retryableCodes: ErrorCode[] = [
    "PROCESS_TIMEOUT",
    "ENGINE_UNAVAILABLE",
    "INSUFFICIENT_DISK_SPACE",
    "RATE_LIMITED",
    "CONCURRENCY_LIMIT",
  ];

  for (const code of retryableCodes) {
    it(`${code} is retryable by default`, () => {
      const err = createAppError(code, "test");
      expect(err.retryable).toBe(true);
    });
  }

  const nonRetryableCodes: ErrorCode[] = [
    "JOB_NOT_FOUND",
    "ENGINE_NOT_FOUND",
    "INPUT_NOT_FOUND",
    "MISSING_CONVERSION_ID",
    "INVALID_STATE",
    "UNSAFE_PATH",
    "ENGINE_EXECUTE_FAILED",
    "VALIDATION_FAILED",
    "ARTIFACT_VALIDATION_FAILED",
    "TOOL_NOT_AVAILABLE",
    "INPUT_UNSUPPORTED",
    "INPUT_CORRUPTED",
    "CAPABILITY_NOT_AVAILABLE",
    "OUTPUT_FORMAT_INVALID",
    "PROCESS_CANCELLED",
    "ARCHIVE_UNSAFE",
    "OCR_LANGUAGE_MISSING",
    "BATCH_PARTIAL_FAILURE",
  ];

  for (const code of nonRetryableCodes) {
    it(`${code} is NOT retryable by default`, () => {
      const err = createAppError(code, "test");
      expect(err.retryable).toBe(false);
    });
  }
});

describe("Error Codes — isRetryable helper", () => {
  it("returns true for retryable codes", () => {
    expect(isRetryable("PROCESS_TIMEOUT")).toBe(true);
    expect(isRetryable("ENGINE_UNAVAILABLE")).toBe(true);
    expect(isRetryable("INSUFFICIENT_DISK_SPACE")).toBe(true);
    expect(isRetryable("RATE_LIMITED")).toBe(true);
    expect(isRetryable("CONCURRENCY_LIMIT")).toBe(true);
  });

  it("returns false for non-retryable codes", () => {
    expect(isRetryable("JOB_NOT_FOUND")).toBe(false);
    expect(isRetryable("ENGINE_EXECUTE_FAILED")).toBe(false);
    expect(isRetryable("VALIDATION_FAILED")).toBe(false);
  });
});

describe("Error Codes — explicit retryable override", () => {
  it("allows overriding a retryable code to false", () => {
    const err = createAppError("PROCESS_TIMEOUT", "timed out", { retryable: false });
    expect(err.retryable).toBe(false);
  });

  it("allows overriding a non-retryable code to true", () => {
    const err = createAppError("JOB_NOT_FOUND", "not found", { retryable: true });
    expect(err.retryable).toBe(true);
  });
});

describe("Error Codes — ERROR_MESSAGES coverage", () => {
  it("every ErrorCode has a user-facing message", () => {
    const allCodes: ErrorCode[] = [
      "TOOL_NOT_AVAILABLE",
      "INPUT_UNSUPPORTED",
      "INPUT_CORRUPTED",
      "CAPABILITY_NOT_AVAILABLE",
      "OUTPUT_FORMAT_INVALID",
      "PROCESS_TIMEOUT",
      "PROCESS_CANCELLED",
      "ARTIFACT_VALIDATION_FAILED",
      "INSUFFICIENT_DISK_SPACE",
      "ARCHIVE_UNSAFE",
      "OCR_LANGUAGE_MISSING",
      "BATCH_PARTIAL_FAILURE",
      "JOB_NOT_FOUND",
      "ENGINE_NOT_FOUND",
      "ENGINE_UNAVAILABLE",
      "UNSAFE_PATH",
      "ENGINE_EXECUTE_FAILED",
      "VALIDATION_FAILED",
      "INPUT_NOT_FOUND",
      "MISSING_CONVERSION_ID",
      "INVALID_STATE",
      "RATE_LIMITED",
      "CONCURRENCY_LIMIT",
    ];

    for (const code of allCodes) {
      expect(ERROR_MESSAGES[code], `Missing message for ${code}`).toBeDefined();
      expect(ERROR_MESSAGES[code].length, `Message for ${code} should not be empty`).toBeGreaterThan(0);
    }
  });

  it("messages are in Spanish (contain accented characters or ñ)", () => {
    // Spot check a few messages contain Spanish text
    expect(ERROR_MESSAGES.JOB_NOT_FOUND).toContain("no");
    expect(ERROR_MESSAGES.PROCESS_TIMEOUT).toContain("tiempo");
    expect(ERROR_MESSAGES.INSUFFICIENT_DISK_SPACE).toContain("disco");
  });
});

describe("Error Codes — type narrowing", () => {
  it("AppError can be distinguished from generic Error", () => {
    const appErr = createAppError("ENGINE_EXECUTE_FAILED", "fail");
    const genericErr = new Error("generic");

    expect("code" in appErr).toBe(true);
    expect("code" in genericErr).toBe(false);
    expect((appErr as { code?: string }).code).toBe("ENGINE_EXECUTE_FAILED");
  });
});
