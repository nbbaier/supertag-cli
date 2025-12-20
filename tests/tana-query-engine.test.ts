/**
 * TDD Test Suite for Tana Query Engine
 *
 * RED phase: These tests will fail until we implement the query engine
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { TanaQueryEngine } from "../src/query/tana-query-engine";
import { TanaIndexer } from "../src/db/indexer";
import { unlinkSync } from "fs";

const TEST_DB_PATH = "./test-query-engine.db";

describe("TanaQueryEngine - Basic Setup (🔴 RED)", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    // Create and populate test database
    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
  });

  afterAll(() => {
    queryEngine.close();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should create query engine instance", () => {
    expect(queryEngine).toBeDefined();
  });

  test("should connect to existing database", () => {
    expect(queryEngine.isConnected()).toBe(true);
  });
});

describe("TanaQueryEngine - Node Queries (🔴 RED)", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
  });

  afterAll(() => {
    queryEngine.close();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should query nodes by name", async () => {
    const results = await queryEngine.findNodes({
      name: "JCF Public",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("JCF Public");
  });

  test("should query nodes with name pattern", async () => {
    const results = await queryEngine.findNodes({
      namePattern: "JCF%",
    });

    expect(results.length).toBeGreaterThan(0);
    // All results should have names (we filter NULL in query now)
    expect(results.every((n) => n.name !== null)).toBe(true);
    // SQL LIKE is case-insensitive by default, so "JCF%" matches "jcf..." too
    // Check that all names start with "jcf" (case-insensitive)
    const allMatch = results.every((n) =>
      n.name?.toLowerCase().startsWith("jcf")
    );
    expect(allMatch).toBe(true);
  });

  test("should query nodes by supertag", async () => {
    // First, get a known supertag
    const supertags = await queryEngine.getAllSupertags();
    if (supertags.length === 0) return; // Skip if no supertags

    const firstTag = supertags[0].tagName;
    const results = await queryEngine.findNodes({
      supertag: firstTag,
    });

    expect(Array.isArray(results)).toBe(true);
  });

  test("should query nodes by ID list", async () => {
    const ids = ["inStMOS_Za", "SYS_T01"];
    const results = await queryEngine.findNodesByIds(ids);

    expect(results.length).toBe(2);
    expect(results.some((n) => n.id === "inStMOS_Za")).toBe(true);
  });

  test("should limit query results", async () => {
    const results = await queryEngine.findNodes({
      namePattern: "%",
      limit: 10,
    });

    expect(results.length).toBeLessThanOrEqual(10);
  });
});

describe("TanaQueryEngine - Supertag Queries (🔴 RED)", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
  });

  afterAll(() => {
    queryEngine.close();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should list all supertags", async () => {
    const supertags = await queryEngine.getAllSupertags();

    expect(supertags.length).toBeGreaterThan(0);
    expect(supertags[0]).toHaveProperty("tagName");
    expect(supertags[0]).toHaveProperty("tagId");
  });

  test("should count nodes per supertag", async () => {
    const counts = await queryEngine.getNodeCountsBySupertag();

    expect(counts.length).toBeGreaterThan(0);
    expect(counts[0]).toHaveProperty("tagName");
    expect(counts[0]).toHaveProperty("count");
    expect(typeof counts[0].count).toBe("number");
  });

  test("should find most used supertags", async () => {
    const topTags = await queryEngine.getTopSupertags(5);

    expect(topTags.length).toBeLessThanOrEqual(5);
    expect(topTags.length).toBeGreaterThan(0);

    // Should be sorted by count descending
    for (let i = 1; i < topTags.length; i++) {
      expect(topTags[i - 1].count).toBeGreaterThanOrEqual(topTags[i].count);
    }
  });
});

describe("TanaQueryEngine - Reference Queries (🔴 RED)", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
  });

  afterAll(() => {
    queryEngine.close();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should get outbound references for node", async () => {
    // Node wLemsA7U0OFg has 2 inline refs
    const refs = await queryEngine.getOutboundReferences("wLemsA7U0OFg");

    expect(refs.length).toBe(2);
    expect(refs[0]).toHaveProperty("toNode");
    expect(refs[0]).toHaveProperty("referenceType");
  });

  test("should get inbound references for node", async () => {
    // Node pYUE1UrKvBPs is referenced by wLemsA7U0OFg
    const refs = await queryEngine.getInboundReferences("pYUE1UrKvBPs");

    expect(refs.length).toBeGreaterThanOrEqual(1);
    expect(refs.some((r) => r.fromNode === "wLemsA7U0OFg")).toBe(true);
  });

  test("should get reference graph for node (depth 1)", async () => {
    const graph = await queryEngine.getReferenceGraph("wLemsA7U0OFg", 1);

    expect(graph).toHaveProperty("node");
    expect(graph).toHaveProperty("outbound");
    expect(graph).toHaveProperty("inbound");
    expect(graph.node.id).toBe("wLemsA7U0OFg");
    expect(graph.outbound.length).toBe(2);
  });

  test("should find all nodes referencing a node", async () => {
    const referrers = await queryEngine.findNodesReferencingNode("pYUE1UrKvBPs");

    expect(referrers.length).toBeGreaterThanOrEqual(1);
    expect(referrers.some((n) => n.id === "wLemsA7U0OFg")).toBe(true);
  });
});

describe("TanaQueryEngine - Full-Text Search (🔴 RED)", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
    await queryEngine.initializeFTS();
  });

  afterAll(() => {
    queryEngine.close();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should create FTS5 index", async () => {
    const hasFTS = await queryEngine.hasFTSIndex();
    expect(hasFTS).toBe(true);
  });

  test("should search node names with FTS5", async () => {
    const results = await queryEngine.searchNodes("JCF");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("id");
    expect(results[0]).toHaveProperty("name");
    expect(results[0]).toHaveProperty("rank");
  });

  test("should rank search results by relevance", async () => {
    const results = await queryEngine.searchNodes("template");

    if (results.length > 1) {
      // FTS5 rank is negative, more negative = less relevant
      // Results should be ordered by rank ascending (less negative first)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].rank).toBeLessThanOrEqual(results[i].rank);
      }
    }
  });

  test("should support multi-word search", async () => {
    const results = await queryEngine.searchNodes("JCF Public");

    expect(results.length).toBeGreaterThan(0);
  });

  test("should limit FTS results", async () => {
    const results = await queryEngine.searchNodes("template", { limit: 5 });

    expect(results.length).toBeLessThanOrEqual(5);
  });
});

describe("TanaQueryEngine - Advanced Queries (🔴 RED)", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
  });

  afterAll(() => {
    queryEngine.close();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should find nodes created after date", async () => {
    const timestamp = Date.now() - 365 * 24 * 60 * 60 * 1000; // 1 year ago
    const results = await queryEngine.findNodes({
      createdAfter: timestamp,
      limit: 10,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((n) => (n.created || 0) >= timestamp)).toBe(true);
  });

  test("should find recently updated nodes", async () => {
    const results = await queryEngine.findRecentlyUpdated(10);

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);

    // Should be sorted by update time descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].updated || 0).toBeGreaterThanOrEqual(
        results[i].updated || 0
      );
    }
  });

  test("should get database statistics", async () => {
    const stats = await queryEngine.getStatistics();

    expect(stats).toHaveProperty("totalNodes");
    expect(stats).toHaveProperty("totalSupertags");
    expect(stats).toHaveProperty("totalFields");
    expect(stats).toHaveProperty("totalReferences");
    expect(stats.totalNodes).toBeGreaterThan(0);
  });
});
