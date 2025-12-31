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

// T-1.2: resolveWorkspaceList tests
describe("resolveWorkspaceList", () => {
  it("should return all workspaces when all=true", async () => {
    const { resolveWorkspaceList } = await import("../src/config/batch-processor");

    const list = resolveWorkspaceList({ all: true });

    // Should return array of available workspaces
    expect(list).toBeArray();
    expect(list.length).toBeGreaterThan(0);
    // Main workspace should be included
    expect(list).toContain("main");
  });

  it("should return explicit workspaces array", async () => {
    const { resolveWorkspaceList } = await import("../src/config/batch-processor");

    const list = resolveWorkspaceList({ workspaces: ["main", "books"] });

    expect(list).toEqual(["main", "books"]);
  });

  it("should return single workspace", async () => {
    const { resolveWorkspaceList } = await import("../src/config/batch-processor");

    const list = resolveWorkspaceList({ workspace: "books" });

    expect(list).toEqual(["books"]);
  });

  it("should default to main workspace", async () => {
    const { resolveWorkspaceList } = await import("../src/config/batch-processor");

    const list = resolveWorkspaceList({});

    // Should return default workspace (main)
    expect(list).toBeArray();
    expect(list.length).toBe(1);
    expect(list[0]).toBe("main");
  });

  it("should prioritize explicit workspaces over all flag", async () => {
    const { resolveWorkspaceList } = await import("../src/config/batch-processor");

    // If both workspaces array and all are specified, workspaces takes priority
    const list = resolveWorkspaceList({ all: true, workspaces: ["books"] });

    expect(list).toEqual(["books"]);
  });
});

// T-1.3: isBatchMode tests
describe("isBatchMode", () => {
  it("should return true for all=true", async () => {
    const { isBatchMode } = await import("../src/config/batch-processor");

    expect(isBatchMode({ all: true })).toBe(true);
  });

  it("should return true for multiple workspaces", async () => {
    const { isBatchMode } = await import("../src/config/batch-processor");

    expect(isBatchMode({ workspaces: ["main", "books"] })).toBe(true);
  });

  it("should return false for single workspace", async () => {
    const { isBatchMode } = await import("../src/config/batch-processor");

    expect(isBatchMode({ workspace: "main" })).toBe(false);
  });

  it("should return false for workspaces=[single]", async () => {
    const { isBatchMode } = await import("../src/config/batch-processor");

    expect(isBatchMode({ workspaces: ["main"] })).toBe(false);
  });

  it("should return false for empty options", async () => {
    const { isBatchMode } = await import("../src/config/batch-processor");

    expect(isBatchMode({})).toBe(false);
  });
});

// T-2.1: processWorkspaces sequential tests
describe("processWorkspaces", () => {
  it("should process single workspace", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    const result = await processWorkspaces(
      { workspace: "main" },
      async (ws) => `processed ${ws.alias}`
    );

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0].result).toBe("processed main");
    expect(result.results[0].success).toBe(true);
  });

  it("should process all workspaces", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    const processed: string[] = [];
    const result = await processWorkspaces(
      { all: true },
      async (ws) => {
        processed.push(ws.alias);
        return `processed ${ws.alias}`;
      }
    );

    expect(result.successful).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
    expect(processed.length).toBeGreaterThan(0);
    expect(processed).toContain("main");
  });

  it("should stop on error by default", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    const processed: string[] = [];
    const result = await processWorkspaces(
      { workspaces: ["main", "nonexistent", "books"] },
      async (ws) => {
        processed.push(ws.alias);
        return ws.alias;
      }
    );

    // Should stop after first failure (nonexistent workspace)
    // main succeeds, nonexistent fails, books never runs
    expect(result.results.length).toBe(2);
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("should continue on error when configured", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    const processed: string[] = [];
    const result = await processWorkspaces(
      { workspaces: ["main", "nonexistent", "books"], continueOnError: true },
      async (ws) => {
        processed.push(ws.alias);
        return ws.alias;
      }
    );

    // Should process all workspaces despite errors
    // main succeeds, nonexistent fails (workspace not found), books - depends on if it exists
    expect(result.results.length).toBe(3);
    expect(result.successful).toBeGreaterThanOrEqual(1); // At least main
    expect(result.failed).toBeGreaterThanOrEqual(1); // At least nonexistent
  });

  it("should call progress callback", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    const calls: string[] = [];
    await processWorkspaces(
      { workspace: "main" },
      async () => "done",
      (alias, i, total, status) => {
        calls.push(`${alias}:${status}`);
      }
    );

    expect(calls).toContain("main:start");
    expect(calls).toContain("main:success");
  });

  it("should track duration per workspace", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    const result = await processWorkspaces(
      { workspace: "main" },
      async () => {
        await new Promise((r) => setTimeout(r, 50));
        return "done";
      }
    );

    expect(result.results[0].duration).toBeGreaterThanOrEqual(50);
    expect(result.totalDuration).toBeGreaterThanOrEqual(50);
  });

  it("should capture error in result", async () => {
    const { processWorkspaces } = await import("../src/config/batch-processor");

    const result = await processWorkspaces(
      { workspaces: ["nonexistent"] },
      async (ws) => ws.alias
    );

    expect(result.failed).toBe(1);
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toBeInstanceOf(Error);
  });
});
