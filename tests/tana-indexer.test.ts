/**
 * TDD Test Suite for Tana SQLite Indexer
 *
 * RED phase: These tests will fail until we implement the indexer
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { TanaIndexer } from "../src/db/indexer";
import { TanaExportParser } from "../src/parsers/tana-export";
import { unlinkSync } from "fs";

const TEST_DB_PATH = "./test-tana-index.db";

describe("TanaIndexer - Schema Creation (🔴 RED)", () => {
  let indexer: TanaIndexer;

  beforeAll(() => {
    // Clean up any existing test database
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    indexer = new TanaIndexer(TEST_DB_PATH);
  });

  afterAll(() => {
    // Clean up test database
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should create database file", () => {
    expect(indexer).toBeDefined();
    // Database should be created on instantiation
    const fs = require("fs");
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
  });

  test("should initialize schema with all tables", async () => {
    await indexer.initializeSchema();

    // Verify tables exist
    const tables = await indexer.getTables();
    expect(tables).toContain("nodes");
    expect(tables).toContain("supertags");
    expect(tables).toContain("fields");
    expect(tables).toContain("references");
  });
});

describe("TanaIndexer - Index Workspace (🔴 RED)", () => {
  let indexer: TanaIndexer;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should index small workspace", async () => {
    const result = await indexer.indexExport(
      "sample_data/K4hTe8I__k@2025-11-30.json"
    );

    expect(result.nodesIndexed).toBeGreaterThan(0);
    expect(result.supertagsIndexed).toBeGreaterThan(0);
    expect(result.fieldsIndexed).toBeGreaterThan(0);
    expect(result.referencesIndexed).toBeGreaterThan(0);

    console.log(`
Indexing Results (Small Workspace):
- Nodes: ${result.nodesIndexed}
- Supertags: ${result.supertagsIndexed}
- Fields: ${result.fieldsIndexed}
- References: ${result.referencesIndexed}
- Duration: ${result.durationMs}ms
    `);
  });

  test("should clear and reindex", async () => {
    // Index once
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");

    // Index again (should clear first)
    const result = await indexer.indexExport(
      "sample_data/K4hTe8I__k@2025-11-30.json"
    );

    expect(result.nodesIndexed).toBeGreaterThan(0);
  });

  test("should handle empty children array", async () => {
    // This should not throw - some nodes have no children
    const result = await indexer.indexExport(
      "sample_data/K4hTe8I__k@2025-11-30.json"
    );
    expect(result.nodesIndexed).toBeGreaterThan(0);
  });
});

describe("TanaIndexer - Query Nodes (🔴 RED)", () => {
  let indexer: TanaIndexer;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should query node by ID", async () => {
    const node = await indexer.getNodeById("inStMOS_Za");

    expect(node).toBeDefined();
    if (node) {
      expect(node.id).toBe("inStMOS_Za");
      expect(node.name).toBe("JCF Public");
    }
  });

  test("should query nodes by name pattern", async () => {
    const nodes = await indexer.findNodesByName("JCF%");

    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0].name).toMatch(/JCF/);
  });

  test("should return null for non-existent node", async () => {
    const node = await indexer.getNodeById("NONEXISTENT_ID");
    expect(node).toBeNull();
  });
});

describe("TanaIndexer - Query Supertags (🔴 RED)", () => {
  let indexer: TanaIndexer;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should list all supertags", async () => {
    const supertags = await indexer.getAllSupertags();

    expect(supertags.length).toBeGreaterThan(0);
    expect(supertags[0]).toHaveProperty("tagName");
    expect(supertags[0]).toHaveProperty("tagId");

    console.log(`Found ${supertags.length} supertags`);
  });

  test("should find nodes by supertag", async () => {
    const supertags = await indexer.getAllSupertags();
    if (supertags.length === 0) return;

    const firstTag = supertags[0].tagName;
    const nodes = await indexer.findNodesBySupertag(firstTag);

    // Some tags might not have nodes
    expect(Array.isArray(nodes)).toBe(true);
  });
});

describe("TanaIndexer - Query References (🔴 RED)", () => {
  let indexer: TanaIndexer;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should find outbound references for node", async () => {
    // Node wLemsA7U0OFg has 2 inline refs
    const refs = await indexer.getOutboundReferences("wLemsA7U0OFg");

    expect(refs.length).toBe(2);
    expect(refs[0]).toHaveProperty("toNode");
    expect(refs[0]).toHaveProperty("referenceType");
  });

  test("should find inbound references for node", async () => {
    // Node pYUE1UrKvBPs is referenced by wLemsA7U0OFg
    const refs = await indexer.getInboundReferences("pYUE1UrKvBPs");

    expect(refs.length).toBeGreaterThanOrEqual(1);
    expect(refs.some((r) => r.fromNode === "wLemsA7U0OFg")).toBe(true);
  });

  test("should return empty array for node with no references", async () => {
    const refs = await indexer.getOutboundReferences("SYS_T01");
    expect(Array.isArray(refs)).toBe(true);
  });
});

describe("TanaIndexer - Performance (🔴 RED)", () => {
  let indexer: TanaIndexer;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should index 4,936 nodes in reasonable time", async () => {
    const startTime = Date.now();
    const result = await indexer.indexExport(
      "sample_data/K4hTe8I__k@2025-11-30.json"
    );
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    expect(result.nodesIndexed).toBeGreaterThan(4000);

    console.log(`Indexed ${result.nodesIndexed} nodes in ${duration}ms`);
  });

  test("should query indexed data quickly", async () => {
    await indexer.indexExport("sample_data/K4hTe8I__k@2025-11-30.json");

    const startTime = Date.now();
    const node = await indexer.getNodeById("inStMOS_Za");
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(50); // Query should be < 50ms
    expect(node).toBeDefined();
  });
});
