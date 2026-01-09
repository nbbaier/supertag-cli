/**
 * TDD Test Suite for Tana Query Engine
 *
 * Uses real Tana export fixtures for testing
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { TanaQueryEngine } from "../src/query/tana-query-engine";
import { TanaIndexer } from "../src/db/indexer";
import { TanaExportParser } from "../src/parsers/tana-export";
import { join } from "path";
import { cleanupSqliteDatabase } from "./test-utils";

const TEST_DB_PATH = "/tmp/supertag-test-query-engine.db";
const FIXTURE_PATH = join(__dirname, "fixtures/sample-workspace.json");

describe("TanaQueryEngine - Basic Setup", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    cleanupSqliteDatabase(TEST_DB_PATH);

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
  });

  afterAll(() => {
    queryEngine.close();
    cleanupSqliteDatabase(TEST_DB_PATH);
  });

  test("should create query engine instance", () => {
    expect(queryEngine).toBeDefined();
  });

  test("should connect to existing database", () => {
    expect(queryEngine.isConnected()).toBe(true);
  });
});

describe("TanaQueryEngine - Node Queries", () => {
  let queryEngine: TanaQueryEngine;
  let sampleNodeId: string;
  let sampleNodeName: string;

  beforeAll(async () => {
    cleanupSqliteDatabase(TEST_DB_PATH);

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);

    // Get sample node data
    const parser = new TanaExportParser();
    const dump = await parser.parseFile(FIXTURE_PATH);
    const nodeWithName = dump.docs.find(
      (d) => d.props.name && !d.props.name.includes("SYS") && d.props.name.length > 5
    );
    if (nodeWithName) {
      sampleNodeId = nodeWithName.id;
      sampleNodeName = nodeWithName.props.name!;
    }
  });

  afterAll(() => {
    queryEngine.close();
    cleanupSqliteDatabase(TEST_DB_PATH);
  });

  test("should query nodes by name", async () => {
    if (!sampleNodeName) return;

    // Use exact match from sample node
    const results = await queryEngine.findNodes({
      name: sampleNodeName,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe(sampleNodeName);
  });

  test("should query nodes with name pattern", async () => {
    if (!sampleNodeName) return;

    // Use first word of sample node name
    const firstWord = sampleNodeName.split(/\s/)[0].replace(/["%]/g, "");
    const results = await queryEngine.findNodes({
      namePattern: `${firstWord}%`,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((n) => n.name !== null)).toBe(true);
  });

  test("should query nodes by supertag", async () => {
    const supertags = await queryEngine.getAllSupertags();
    if (supertags.length === 0) return;

    const firstTag = supertags[0].tagName;
    const results = await queryEngine.findNodes({
      supertag: firstTag,
    });

    expect(Array.isArray(results)).toBe(true);
  });

  test("should query nodes by ID list", async () => {
    if (!sampleNodeId) return;

    const ids = [sampleNodeId];
    const results = await queryEngine.findNodesByIds(ids);

    expect(results.length).toBe(1);
    expect(results[0].id).toBe(sampleNodeId);
  });

  test("should limit query results", async () => {
    const results = await queryEngine.findNodes({
      namePattern: "%",
      limit: 5,
    });

    expect(results.length).toBeLessThanOrEqual(5);
  });
});

describe("TanaQueryEngine - Supertag Queries", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    cleanupSqliteDatabase(TEST_DB_PATH);

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
  });

  afterAll(() => {
    queryEngine.close();
    cleanupSqliteDatabase(TEST_DB_PATH);
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
  });
});

describe("TanaQueryEngine - Reference Queries", () => {
  let queryEngine: TanaQueryEngine;
  let nodeWithRefs: string | null = null;
  let referencedNode: string | null = null;

  beforeAll(async () => {
    cleanupSqliteDatabase(TEST_DB_PATH);

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);

    // Find nodes with references
    const parser = new TanaExportParser();
    const dump = await parser.parseFile(FIXTURE_PATH);
    const graph = parser.buildGraph(dump);

    if (graph.inlineRefs.length > 0) {
      nodeWithRefs = graph.inlineRefs[0].sourceNodeId;
      referencedNode = graph.inlineRefs[0].targetNodeIds[0];
    }
  });

  afterAll(() => {
    queryEngine.close();
    cleanupSqliteDatabase(TEST_DB_PATH);
  });

  test("should get outbound references for node", async () => {
    if (!nodeWithRefs) {
      console.log("No nodes with references in fixture, skipping test");
      return;
    }

    const refs = await queryEngine.getOutboundReferences(nodeWithRefs);

    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0]).toHaveProperty("toNode");
    expect(refs[0]).toHaveProperty("referenceType");
  });

  test("should get inbound references for node", async () => {
    if (!referencedNode) {
      console.log("No referenced nodes in fixture, skipping test");
      return;
    }

    const refs = await queryEngine.getInboundReferences(referencedNode);

    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  test("should get reference graph for node (depth 1)", async () => {
    if (!nodeWithRefs) {
      console.log("No nodes with references in fixture, skipping test");
      return;
    }

    const graph = await queryEngine.getReferenceGraph(nodeWithRefs, 1);

    expect(graph).toHaveProperty("node");
    expect(graph).toHaveProperty("outbound");
    expect(graph).toHaveProperty("inbound");
    expect(graph.node.id).toBe(nodeWithRefs);
  });

  test("should find all nodes referencing a node", async () => {
    if (!referencedNode) {
      console.log("No referenced nodes in fixture, skipping test");
      return;
    }

    const referrers = await queryEngine.findNodesReferencingNode(referencedNode);

    expect(referrers.length).toBeGreaterThanOrEqual(1);
  });
});

describe("TanaQueryEngine - Full-Text Search", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    cleanupSqliteDatabase(TEST_DB_PATH);

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
    await queryEngine.initializeFTS();
  });

  afterAll(() => {
    queryEngine.close();
    cleanupSqliteDatabase(TEST_DB_PATH);
  });

  test("should create FTS5 index", async () => {
    const hasFTS = await queryEngine.hasFTSIndex();
    expect(hasFTS).toBe(true);
  });

  test("should search node names with FTS5", async () => {
    // Search for common word that should exist
    const results = await queryEngine.searchNodes("the");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("id");
    expect(results[0]).toHaveProperty("name");
    expect(results[0]).toHaveProperty("rank");
  });

  test("should limit FTS results", async () => {
    const results = await queryEngine.searchNodes("the", { limit: 2 });

    expect(results.length).toBeLessThanOrEqual(2);
  });
});

describe("TanaQueryEngine - Advanced Queries", () => {
  let queryEngine: TanaQueryEngine;

  beforeAll(async () => {
    cleanupSqliteDatabase(TEST_DB_PATH);

    const indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
    await indexer.indexExport(FIXTURE_PATH);
    indexer.close();

    queryEngine = new TanaQueryEngine(TEST_DB_PATH);
  });

  afterAll(() => {
    queryEngine.close();
    cleanupSqliteDatabase(TEST_DB_PATH);
  });

  test("should find nodes created after date", async () => {
    const timestamp = 1600000000000; // Before fixture data
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
