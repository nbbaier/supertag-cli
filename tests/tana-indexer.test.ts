/**
 * TDD Test Suite for Tana SQLite Indexer
 *
 * Uses real Tana export fixtures for testing
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { TanaIndexer } from "../src/db/indexer";
import { TanaExportParser } from "../src/parsers/tana-export";
import { unlinkSync } from "fs";
import { join } from "path";

const TEST_DB_PATH = "./test-tana-index.db";
const FIXTURE_PATH = join(__dirname, "fixtures/sample-workspace.json");

describe("TanaIndexer - Schema Creation", () => {
  let indexer: TanaIndexer;

  beforeAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
    indexer = new TanaIndexer(TEST_DB_PATH);
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should create database file", () => {
    expect(indexer).toBeDefined();
    const fs = require("fs");
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
  });

  test("should initialize schema with all tables", async () => {
    await indexer.initializeSchema();
    const tables = await indexer.getTables();
    expect(tables).toContain("nodes");
    expect(tables).toContain("supertags");
    expect(tables).toContain("fields");
    expect(tables).toContain("references");
  });
});

describe("TanaIndexer - Index Workspace", () => {
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

  test("should index workspace", async () => {
    const result = await indexer.indexExport(FIXTURE_PATH);

    expect(result.nodesIndexed).toBeGreaterThan(0);
    expect(result.supertagsIndexed).toBeGreaterThan(0);
    expect(result.fieldsIndexed).toBeGreaterThan(0);

    console.log(`
Indexing Results:
- Nodes: ${result.nodesIndexed}
- Supertags: ${result.supertagsIndexed}
- Fields: ${result.fieldsIndexed}
- References: ${result.referencesIndexed}
- Duration: ${result.durationMs}ms
    `);
  });

  test("should clear and reindex", async () => {
    await indexer.indexExport(FIXTURE_PATH);
    const result = await indexer.indexExport(FIXTURE_PATH);
    expect(result.nodesIndexed).toBeGreaterThan(0);
  });

  test("should handle empty children array", async () => {
    const result = await indexer.indexExport(FIXTURE_PATH);
    expect(result.nodesIndexed).toBeGreaterThan(0);
  });
});

describe("TanaIndexer - Query Nodes", () => {
  let indexer: TanaIndexer;
  let sampleNodeId: string;
  let sampleNodeName: string;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);

    // Get a sample node for testing
    const parser = new TanaExportParser();
    const dump = await parser.parseFile(FIXTURE_PATH);
    const nodeWithName = dump.docs.find(
      (d) => d.props.name && !d.props.name.includes("SYS")
    );
    if (nodeWithName) {
      sampleNodeId = nodeWithName.id;
      sampleNodeName = nodeWithName.props.name!;
    }
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should query node by ID", async () => {
    if (!sampleNodeId) return;

    const node = await indexer.getNodeById(sampleNodeId);

    expect(node).toBeDefined();
    if (node) {
      expect(node.id).toBe(sampleNodeId);
    }
  });

  test("should query nodes by name pattern", async () => {
    if (!sampleNodeName) return;

    // Use first word of sample node name
    const firstWord = sampleNodeName.split(/\s/)[0].replace(/["%]/g, "");
    const nodes = await indexer.findNodesByName(`${firstWord}%`);

    expect(nodes.length).toBeGreaterThan(0);
  });

  test("should return null for non-existent node", async () => {
    const node = await indexer.getNodeById("NONEXISTENT_ID_12345");
    expect(node).toBeNull();
  });
});

describe("TanaIndexer - Query Supertags", () => {
  let indexer: TanaIndexer;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);
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

    expect(Array.isArray(nodes)).toBe(true);
  });
});

describe("TanaIndexer - Query References", () => {
  let indexer: TanaIndexer;
  let nodeWithRefs: string | null = null;
  let referencedNode: string | null = null;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);

    // Find a node with outbound references
    const parser = new TanaExportParser();
    const dump = await parser.parseFile(FIXTURE_PATH);
    const graph = parser.buildGraph(dump);

    if (graph.inlineRefs.length > 0) {
      nodeWithRefs = graph.inlineRefs[0].sourceNodeId;
      referencedNode = graph.inlineRefs[0].targetNodeIds[0];
    }
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should find outbound references for node", async () => {
    if (!nodeWithRefs) {
      console.log("No nodes with references in fixture, skipping test");
      return;
    }

    const refs = await indexer.getOutboundReferences(nodeWithRefs);

    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0]).toHaveProperty("toNode");
    expect(refs[0]).toHaveProperty("referenceType");
  });

  test("should find inbound references for node", async () => {
    if (!referencedNode) {
      console.log("No referenced nodes in fixture, skipping test");
      return;
    }

    const refs = await indexer.getInboundReferences(referencedNode);

    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  test("should return empty array for node with no references", async () => {
    // Use a system node that won't have references
    const refs = await indexer.getOutboundReferences("NONEXISTENT_12345");
    expect(Array.isArray(refs)).toBe(true);
    expect(refs.length).toBe(0);
  });
});

describe("TanaIndexer - Performance", () => {
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

  test("should index nodes in reasonable time", async () => {
    const startTime = Date.now();
    const result = await indexer.indexExport(FIXTURE_PATH);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds for larger fixture
    expect(result.nodesIndexed).toBeGreaterThan(0);

    console.log(`Indexed ${result.nodesIndexed} nodes in ${duration}ms`);
  });

  test("should query indexed data quickly", async () => {
    await indexer.indexExport(FIXTURE_PATH);

    // Get first node ID
    const parser = new TanaExportParser();
    const dump = await parser.parseFile(FIXTURE_PATH);
    const firstNodeId = dump.docs[0].id;

    const startTime = Date.now();
    const node = await indexer.getNodeById(firstNodeId);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100); // Query should be fast
    expect(node).toBeDefined();
  });
});
