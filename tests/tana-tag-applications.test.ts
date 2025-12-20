/**
 * TDD Test Suite for Tana Tag Applications
 *
 * Tests for detecting which nodes have which supertags APPLIED to them.
 * This is different from supertag DEFINITIONS (SYS_A13 + SYS_T01).
 *
 * Tag application pattern (from tana-helper):
 * - Node children contains SYS_A13 (tag marker)
 * - Node children does NOT contain SYS_T01 (supertag definition)
 * - Node children does NOT contain SYS_T02 (field definition)
 * - The actual tagged node is found via: node.props._ownerId -> meta_node -> meta_node.props._ownerId -> data_node
 * - The tag IDs are the non-SYS children
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { TanaExportParser } from "../src/parsers/tana-export";
import type { TanaDump, TanaGraph, TagApplication } from "../src/types/tana-dump";

describe("TanaExportParser - Tag Applications (RED)", () => {
  let parser: TanaExportParser;
  let dump: TanaDump;
  let graph: TanaGraph;

  beforeAll(async () => {
    parser = new TanaExportParser();
    dump = await parser.parseFile("sample_data/K4hTe8I__k@2025-11-30.json");
    graph = parser.buildGraph(dump);
  });

  test("should detect tag applications (nodes with tags applied)", () => {
    // The graph should have a tagApplications collection
    expect(graph.tagApplications).toBeDefined();
    expect(graph.tagApplications.length).toBeGreaterThan(0);
  });

  test("should link tagged nodes to their tag definitions", () => {
    // Each tag application should have:
    // - dataNodeId: the node that has the tag
    // - tagId: the supertag node ID
    // - tagName: the supertag name (resolved)
    for (const app of graph.tagApplications) {
      expect(app.dataNodeId).toBeDefined();
      expect(app.tagId).toBeDefined();
      expect(app.tagName).toBeDefined();
      expect(typeof app.tagName).toBe("string");
      expect(app.tagName.length).toBeGreaterThan(0);
    }
  });

  test("should not confuse tag applications with tag definitions", () => {
    // Tag applications should reference nodes that are NOT the tag definition nodes
    const supertagNodeIds = new Set(
      Array.from(graph.supertags.values()).map((t) => t.nodeId)
    );

    for (const app of graph.tagApplications) {
      // The tuple node for an application should be different from definition tuples
      expect(supertagNodeIds.has(app.tupleNodeId)).toBe(false);
    }
  });

  test("should find nodes tagged with specific supertags", () => {
    // Group applications by tag name
    const byTagName = new Map<string, TagApplication[]>();
    for (const app of graph.tagApplications) {
      const existing = byTagName.get(app.tagName) || [];
      existing.push(app);
      byTagName.set(app.tagName, existing);
    }

    // Should have multiple tags with applications
    expect(byTagName.size).toBeGreaterThan(0);

    // Log some stats
    console.log(`Found ${graph.tagApplications.length} tag applications across ${byTagName.size} different tags`);

    // Show top tags by application count
    const sorted = Array.from(byTagName.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    console.log("Top 10 tags by application count:");
    for (const [tagName, apps] of sorted) {
      console.log(`  - ${tagName}: ${apps.length} nodes`);
    }
  });

  test("should not include trashed nodes in tag applications", () => {
    for (const app of graph.tagApplications) {
      expect(graph.trash.has(app.dataNodeId)).toBe(false);
      expect(graph.trash.has(app.tagId)).toBe(false);
    }
  });

  test("should resolve data node names", () => {
    // Check that we can look up the actual node names
    let nodesWithNames = 0;
    for (const app of graph.tagApplications) {
      const dataNode = graph.nodes.get(app.dataNodeId);
      if (dataNode?.props.name) {
        nodesWithNames++;
      }
    }

    // Most tagged nodes should have names
    const ratio = nodesWithNames / graph.tagApplications.length;
    console.log(`${nodesWithNames}/${graph.tagApplications.length} (${(ratio * 100).toFixed(1)}%) tagged nodes have names`);
    expect(ratio).toBeGreaterThan(0.5); // At least 50% should have names
  });
});

describe("TanaExportParser - Tag Application Indexing (RED)", () => {
  let parser: TanaExportParser;
  let dump: TanaDump;
  let graph: TanaGraph;

  beforeAll(async () => {
    parser = new TanaExportParser();
    dump = await parser.parseFile("sample_data/K4hTe8I__k@2025-11-30.json");
    graph = parser.buildGraph(dump);
  });

  test("should be able to find all nodes with a specific tag", () => {
    // Get a tag name that has applications
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
    // Group by dataNodeId to find nodes with multiple tags
    const tagsByNode = new Map<string, string[]>();
    for (const app of graph.tagApplications) {
      const existing = tagsByNode.get(app.dataNodeId) || [];
      existing.push(app.tagName);
      tagsByNode.set(app.dataNodeId, existing);
    }

    // Find nodes with multiple tags
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
