/**
 * TDD Test Suite for Tana Tag Applications
 *
 * Tests for detecting which nodes have which supertags APPLIED to them.
 * Uses synthetic test fixtures for reproducible testing.
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { TanaExportParser } from "../src/parsers/tana-export";
import type { TanaDump, TanaGraph, TagApplication } from "../src/types/tana-dump";
import { join } from "path";

const FIXTURE_PATH = join(__dirname, "fixtures/sample-workspace.json");

describe("TanaExportParser - Tag Applications", () => {
  let parser: TanaExportParser;
  let dump: TanaDump;
  let graph: TanaGraph;

  beforeAll(async () => {
    parser = new TanaExportParser();
    dump = await parser.parseFile(FIXTURE_PATH);
    graph = parser.buildGraph(dump);
  });

  test("should detect tag applications (nodes with tags applied)", () => {
    expect(graph.tagApplications).toBeDefined();
    expect(graph.tagApplications.length).toBeGreaterThan(0);
  });

  test("should link tagged nodes to their tag definitions", () => {
    for (const app of graph.tagApplications) {
      expect(app.dataNodeId).toBeDefined();
      expect(app.tagId).toBeDefined();
      expect(app.tagName).toBeDefined();
      expect(typeof app.tagName).toBe("string");
      expect(app.tagName.length).toBeGreaterThan(0);
    }
  });

  test("should not confuse tag applications with tag definitions", () => {
    const supertagNodeIds = new Set(
      Array.from(graph.supertags.values()).map((t) => t.nodeId)
    );

    for (const app of graph.tagApplications) {
      expect(supertagNodeIds.has(app.tupleNodeId)).toBe(false);
    }
  });

  test("should find nodes tagged with specific supertags", () => {
    const byTagName = new Map<string, TagApplication[]>();
    for (const app of graph.tagApplications) {
      const existing = byTagName.get(app.tagName) || [];
      existing.push(app);
      byTagName.set(app.tagName, existing);
    }

    expect(byTagName.size).toBeGreaterThan(0);

    console.log(`Found ${graph.tagApplications.length} tag applications across ${byTagName.size} different tags`);
  });

  test("should not include trashed nodes in tag applications", () => {
    for (const app of graph.tagApplications) {
      expect(graph.trash.has(app.dataNodeId)).toBe(false);
      expect(graph.trash.has(app.tagId)).toBe(false);
    }
  });

  test("should resolve data node names", () => {
    let nodesWithNames = 0;
    for (const app of graph.tagApplications) {
      const dataNode = graph.nodes.get(app.dataNodeId);
      if (dataNode?.props.name) {
        nodesWithNames++;
      }
    }

    const ratio = nodesWithNames / graph.tagApplications.length;
    console.log(`${nodesWithNames}/${graph.tagApplications.length} (${(ratio * 100).toFixed(1)}%) tagged nodes have names`);
    expect(ratio).toBeGreaterThan(0.5);
  });
});

describe("TanaExportParser - Tag Application Indexing", () => {
  let parser: TanaExportParser;
  let dump: TanaDump;
  let graph: TanaGraph;

  beforeAll(async () => {
    parser = new TanaExportParser();
    dump = await parser.parseFile(FIXTURE_PATH);
    graph = parser.buildGraph(dump);
  });

  test("should be able to find all nodes with a specific tag", () => {
    const firstApp = graph.tagApplications[0];
    if (!firstApp) {
      console.log("No tag applications found, skipping test");
      return;
    }

    const targetTag = firstApp.tagName;
    const nodesWithTag = graph.tagApplications.filter(
      (app) => app.tagName === targetTag
    );

    expect(nodesWithTag.length).toBeGreaterThan(0);
    console.log(`Found ${nodesWithTag.length} nodes tagged with "${targetTag}"`);
  });

  test("should handle nodes with multiple tags", () => {
    const tagsByNode = new Map<string, string[]>();
    for (const app of graph.tagApplications) {
      const existing = tagsByNode.get(app.dataNodeId) || [];
      existing.push(app.tagName);
      tagsByNode.set(app.dataNodeId, existing);
    }

    const multiTagged = Array.from(tagsByNode.entries()).filter(
      ([_, tags]) => tags.length > 1
    );

    if (multiTagged.length > 0) {
      console.log(`Found ${multiTagged.length} nodes with multiple tags`);
      const [nodeId, tags] = multiTagged[0];
      const node = graph.nodes.get(nodeId);
      console.log(`  Example: "${node?.props.name || nodeId}" has tags: ${tags.join(", ")}`);
    }
  });
});
