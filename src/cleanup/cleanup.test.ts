/**
 * Export Cleanup Tests
 *
 * TDD tests for the export cleanup functionality.
 * Tests retention policy with configurable file count.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  cleanupExports,
  getExportFiles,
  type CleanupOptions,
  type CleanupResult,
} from "./cleanup";

describe("Export Cleanup", () => {
  let testDir: string;

  beforeEach(() => {
    // Create temp directory for tests
    testDir = join(tmpdir(), `tana-cleanup-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create mock export files
   */
  function createMockExports(dates: string[]): void {
    for (const date of dates) {
      const filename = `M9rkJkwuED@${date}.json`;
      writeFileSync(join(testDir, filename), JSON.stringify({ test: true }));
    }
  }

  describe("getExportFiles", () => {
    it("should find all export files matching Tana pattern", () => {
      createMockExports(["2025-12-01", "2025-12-02", "2025-12-03"]);
      // Add non-export file that should be ignored
      writeFileSync(join(testDir, "other-file.json"), "{}");
      writeFileSync(join(testDir, "readme.txt"), "hello");

      const files = getExportFiles(testDir);

      expect(files).toHaveLength(3);
      expect(files.every((f) => f.match(/@\d{4}-\d{2}-\d{2}\.json$/))).toBe(
        true
      );
    });

    it("should return files sorted by date descending (newest first)", () => {
      createMockExports(["2025-12-01", "2025-12-05", "2025-12-03"]);

      const files = getExportFiles(testDir);

      expect(files[0]).toContain("2025-12-05");
      expect(files[1]).toContain("2025-12-03");
      expect(files[2]).toContain("2025-12-01");
    });

    it("should return empty array for empty directory", () => {
      const files = getExportFiles(testDir);
      expect(files).toHaveLength(0);
    });

    it("should return empty array for non-existent directory", () => {
      const files = getExportFiles("/non/existent/path");
      expect(files).toHaveLength(0);
    });
  });

  describe("cleanupExports", () => {
    it("should keep the specified number of files (default 7)", () => {
      // Create 10 export files
      createMockExports([
        "2025-12-01",
        "2025-12-02",
        "2025-12-03",
        "2025-12-04",
        "2025-12-05",
        "2025-12-06",
        "2025-12-07",
        "2025-12-08",
        "2025-12-09",
        "2025-12-10",
      ]);

      const result = cleanupExports(testDir);

      expect(result.deleted).toHaveLength(3);
      expect(result.kept).toHaveLength(7);
      // Verify newest files are kept
      expect(result.kept[0]).toContain("2025-12-10");
      expect(result.kept[6]).toContain("2025-12-04");
      // Verify oldest files are deleted
      expect(result.deleted).toContainEqual(
        expect.stringContaining("2025-12-01")
      );
      expect(result.deleted).toContainEqual(
        expect.stringContaining("2025-12-02")
      );
      expect(result.deleted).toContainEqual(
        expect.stringContaining("2025-12-03")
      );
    });

    it("should respect custom keepCount option", () => {
      createMockExports([
        "2025-12-01",
        "2025-12-02",
        "2025-12-03",
        "2025-12-04",
        "2025-12-05",
      ]);

      const result = cleanupExports(testDir, { keepCount: 2 });

      expect(result.deleted).toHaveLength(3);
      expect(result.kept).toHaveLength(2);
      expect(result.kept[0]).toContain("2025-12-05");
      expect(result.kept[1]).toContain("2025-12-04");
    });

    it("should do nothing when fewer files than keepCount", () => {
      createMockExports(["2025-12-01", "2025-12-02", "2025-12-03"]);

      const result = cleanupExports(testDir, { keepCount: 7 });

      expect(result.deleted).toHaveLength(0);
      expect(result.kept).toHaveLength(3);
    });

    it("should support dry-run mode without deleting files", () => {
      createMockExports([
        "2025-12-01",
        "2025-12-02",
        "2025-12-03",
        "2025-12-04",
        "2025-12-05",
      ]);

      const result = cleanupExports(testDir, { keepCount: 2, dryRun: true });

      expect(result.deleted).toHaveLength(3);
      expect(result.dryRun).toBe(true);
      // Verify files still exist
      const remainingFiles = readdirSync(testDir);
      expect(remainingFiles).toHaveLength(5);
    });

    it("should actually delete files when not in dry-run mode", () => {
      createMockExports([
        "2025-12-01",
        "2025-12-02",
        "2025-12-03",
        "2025-12-04",
        "2025-12-05",
      ]);

      const result = cleanupExports(testDir, { keepCount: 2, dryRun: false });

      expect(result.deleted).toHaveLength(3);
      expect(result.dryRun).toBe(false);
      // Verify files are actually deleted
      const remainingFiles = readdirSync(testDir);
      expect(remainingFiles).toHaveLength(2);
    });

    it("should handle non-existent directory gracefully", () => {
      const result = cleanupExports("/non/existent/path");

      expect(result.deleted).toHaveLength(0);
      expect(result.kept).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it("should return error for invalid keepCount", () => {
      const result = cleanupExports(testDir, { keepCount: 0 });
      expect(result.error).toBeDefined();
      expect(result.error).toContain("keepCount must be at least 1");

      const result2 = cleanupExports(testDir, { keepCount: -1 });
      expect(result2.error).toBeDefined();
    });

    it("should report bytes freed", () => {
      createMockExports(["2025-12-01", "2025-12-02", "2025-12-03"]);

      const result = cleanupExports(testDir, { keepCount: 1, dryRun: false });

      expect(result.bytesFreed).toBeGreaterThan(0);
    });
  });

  describe("CleanupOptions defaults", () => {
    it("should use keepCount=7 as default", () => {
      createMockExports([
        "2025-12-01",
        "2025-12-02",
        "2025-12-03",
        "2025-12-04",
        "2025-12-05",
        "2025-12-06",
        "2025-12-07",
        "2025-12-08",
        "2025-12-09",
        "2025-12-10",
      ]);

      const result = cleanupExports(testDir);

      expect(result.kept).toHaveLength(7);
    });

    it("should use dryRun=false as default", () => {
      createMockExports(["2025-12-01", "2025-12-02", "2025-12-03"]);

      const result = cleanupExports(testDir, { keepCount: 1 });

      expect(result.dryRun).toBe(false);
      // Verify files are deleted
      const remainingFiles = readdirSync(testDir);
      expect(remainingFiles).toHaveLength(1);
    });
  });
});
