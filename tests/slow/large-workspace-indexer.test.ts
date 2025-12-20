/**
 * Test indexing large workspace (1.2M nodes)
 *
 * Validates indexer performance at production scale
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { TanaIndexer } from "../../src/db/indexer";
import { unlinkSync } from "fs";

const TEST_DB_PATH = "./test-large-index.db";

describe("TanaIndexer - Large Workspace (1.2M nodes)", () => {
  let indexer: TanaIndexer;

  beforeAll(async () => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}

    indexer = new TanaIndexer(TEST_DB_PATH);
    await indexer.initializeSchema();
  });

  afterAll(() => {
    indexer.close();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {}
  });

  test("should index 1.2M node workspace in reasonable time", async () => {
    const startTime = Date.now();
    const result = await indexer.indexExport(
      "sample_data/M9rkJkwuED@2025-11-30.json"
    );
    const duration = Date.now() - startTime;

    expect(result.nodesIndexed).toBeGreaterThan(1000000);
    expect(duration).toBeLessThan(60000); // Should complete in < 60 seconds

    console.log(`
Large Workspace Indexing Results:
- Nodes: ${result.nodesIndexed.toLocaleString()}
- Supertags: ${result.supertagsIndexed.toLocaleString()}
- Fields: ${result.fieldsIndexed.toLocaleString()}
- References: ${result.referencesIndexed.toLocaleString()}
- Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)
- Throughput: ${Math.round(result.nodesIndexed / (duration / 1000)).toLocaleString()} nodes/sec
    `);
  });

  test("should query indexed data quickly", async () => {
    await indexer.indexExport("sample_data/M9rkJkwuED@2025-11-30.json");

    const startTime = Date.now();
    const node = await indexer.getNodeById("inStMOS_Za");
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100); // Query should be < 100ms
    expect(node).toBeDefined();
  });
});
