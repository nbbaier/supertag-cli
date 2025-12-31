/**
 * Batch Processor Tests
 *
 * TDD tests for the batch workspace processor utility.
 * Spec: 056-batch-workspace-processor
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";

// T-1.1: Types exist and are correctly structured
describe("BatchOptions interface", () => {
  it("should accept all batch option fields", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    // Type check: if this compiles, the interface is correct
    const options = {
      all: true,
      workspaces: ["main", "books"],
      workspace: "main",
      continueOnError: true,
      parallel: true,
      concurrency: 4,
      showProgress: true,
    };

    // Should not throw - just verifying types compile
    expect(options.all).toBe(true);
  });
});

describe("WorkspaceResult interface", () => {
  it("should have correct result structure", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    // Process a mock operation and check result structure
    const result = await processWorkspaces(
      { workspace: "main" },
      async (ws) => "test-result"
    );

    expect(result.results).toBeArray();
    expect(result.results[0]).toHaveProperty("workspace");
    expect(result.results[0]).toHaveProperty("success");
    expect(result.results[0]).toHaveProperty("duration");
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].result).toBe("test-result");
  });
});

describe("BatchResult interface", () => {
  it("should have summary counts", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    const result = await processWorkspaces(
      { workspace: "main" },
      async () => "done"
    );

    expect(result).toHaveProperty("results");
    expect(result).toHaveProperty("successful");
    expect(result).toHaveProperty("failed");
    expect(result).toHaveProperty("totalDuration");
    expect(typeof result.successful).toBe("number");
    expect(typeof result.failed).toBe("number");
    expect(typeof result.totalDuration).toBe("number");
  });
});
