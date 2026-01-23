/**
 * Tests for Semantic Search --min-score Option
 *
 * TDD tests for filtering semantic search results by minimum similarity score.
 */

import { describe, it, expect } from "bun:test";

/**
 * Unit tests for the min-score filtering logic
 */
describe("Semantic Search --min-score", () => {
  // Mock search results for testing
  const mockResults = [
    { nodeId: "node1", name: "High match", similarity: 0.85, tags: ["note"] },
    { nodeId: "node2", name: "Medium match", similarity: 0.65, tags: ["task"] },
    { nodeId: "node3", name: "Low match", similarity: 0.45, tags: [] },
    { nodeId: "node4", name: "Very low match", similarity: 0.25, tags: ["idea"] },
  ];

  describe("filterByMinScore function", () => {
    // Import the function we'll create
    let filterByMinScore: (
      results: typeof mockResults,
      minScore: number
    ) => typeof mockResults;

    it("should import filterByMinScore from search module", async () => {
      const module = await import("../src/commands/search");
      filterByMinScore = module.filterByMinScore;
      expect(typeof filterByMinScore).toBe("function");
    });

    it("should return all results when minScore is 0", async () => {
      const module = await import("../src/commands/search");
      filterByMinScore = module.filterByMinScore;

      const filtered = filterByMinScore(mockResults, 0);
      expect(filtered).toHaveLength(4);
    });

    it("should return no results when minScore is 1", async () => {
      const module = await import("../src/commands/search");
      filterByMinScore = module.filterByMinScore;

      const filtered = filterByMinScore(mockResults, 1);
      expect(filtered).toHaveLength(0);
    });

    it("should filter results below minScore threshold", async () => {
      const module = await import("../src/commands/search");
      filterByMinScore = module.filterByMinScore;

      // Only results with similarity >= 0.5
      const filtered = filterByMinScore(mockResults, 0.5);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.nodeId)).toEqual(["node1", "node2"]);
    });

    it("should handle exact threshold match (inclusive)", async () => {
      const module = await import("../src/commands/search");
      filterByMinScore = module.filterByMinScore;

      // 0.65 exactly matches node2
      const filtered = filterByMinScore(mockResults, 0.65);
      expect(filtered).toHaveLength(2);
      expect(filtered.some((r) => r.nodeId === "node2")).toBe(true);
    });

    it("should return empty array for empty input", async () => {
      const module = await import("../src/commands/search");
      filterByMinScore = module.filterByMinScore;

      const filtered = filterByMinScore([], 0.5);
      expect(filtered).toHaveLength(0);
    });

    it("should handle undefined minScore (return all)", async () => {
      const module = await import("../src/commands/search");
      filterByMinScore = module.filterByMinScore;

      // When minScore is undefined, should return all results
      const filtered = filterByMinScore(mockResults, undefined as unknown as number);
      expect(filtered).toHaveLength(4);
    });
  });

  describe("parseMinScore function", () => {
    let parseMinScore: (value: string | undefined) => number | undefined;

    it("should import parseMinScore from search module", async () => {
      const module = await import("../src/commands/search");
      parseMinScore = module.parseMinScore;
      expect(typeof parseMinScore).toBe("function");
    });

    it("should parse decimal values (0.75)", async () => {
      const module = await import("../src/commands/search");
      parseMinScore = module.parseMinScore;

      expect(parseMinScore("0.75")).toBe(0.75);
    });

    it("should parse percentage values and convert to decimal (75)", async () => {
      const module = await import("../src/commands/search");
      parseMinScore = module.parseMinScore;

      // 75 should be interpreted as 75% = 0.75
      expect(parseMinScore("75")).toBe(0.75);
    });

    it("should handle 0 and 100 edge cases", async () => {
      const module = await import("../src/commands/search");
      parseMinScore = module.parseMinScore;

      expect(parseMinScore("0")).toBe(0);
      expect(parseMinScore("100")).toBe(1);   // 100% = 1
      expect(parseMinScore("1")).toBe(1);     // 1 (<=1) treated as decimal = 1
      expect(parseMinScore("1.0")).toBe(1);   // 1.0 as decimal = 1
      expect(parseMinScore("50")).toBe(0.5);  // 50 (>1, no decimal) = 50% = 0.5
    });

    it("should return undefined for undefined input", async () => {
      const module = await import("../src/commands/search");
      parseMinScore = module.parseMinScore;

      expect(parseMinScore(undefined)).toBeUndefined();
    });

    it("should clamp values to [0, 1] range", async () => {
      const module = await import("../src/commands/search");
      parseMinScore = module.parseMinScore;

      expect(parseMinScore("-0.5")).toBe(0);
      expect(parseMinScore("150")).toBe(1); // 150% clamped to 1
    });
  });

  describe("CLI option parsing", () => {
    it("should accept --min-score option in semantic search", async () => {
      // Test that the command accepts the option (doesn't error)
      const { createSearchCommand } = await import("../src/commands/search");
      const cmd = createSearchCommand();

      // Check that --min-score is in the options
      const options = cmd.options.map((opt) => opt.long);
      expect(options).toContain("--min-score");
    });

    it("--min-score should have correct description", async () => {
      const { createSearchCommand } = await import("../src/commands/search");
      const cmd = createSearchCommand();

      const minScoreOpt = cmd.options.find((opt) => opt.long === "--min-score");
      expect(minScoreOpt).toBeDefined();
      expect(minScoreOpt?.description).toContain("similarity");
    });
  });
});
