/**
 * Tests for Contextualized Embeddings
 *
 * TDD tests for buildContextualizedNode and batchContextualizeNodes functions.
 * These functions provide ancestor context to improve embedding quality.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
  buildContextualizedNode,
  batchContextualizeNodes,
  type ContextualizedNode,
} from "./contextualize";

describe("buildContextualizedNode", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");

    // Create minimal schema needed for ancestor resolution
    // Uses tag_applications table (as used by findMeaningfulAncestor)
    db.exec(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        parent_id TEXT
      );

      CREATE TABLE tag_applications (
        tag_node_id TEXT,
        data_node_id TEXT,
        tag_name TEXT,
        PRIMARY KEY (tag_node_id, data_node_id)
      );
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe("node without supertag ancestry", () => {
    it("should return node name as-is when no ancestors have supertags", () => {
      // Insert a node with no supertags or parents
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "node1",
        "My Note",
        null,
      ]);

      const result = buildContextualizedNode(db, "node1", "My Note");

      expect(result).toEqual({
        nodeId: "node1",
        nodeName: "My Note",
        ancestorId: null,
        ancestorName: null,
        ancestorTags: [],
        contextText: "My Note",
      });
    });

    it("should return node name when parent exists but has no supertag", () => {
      // Parent without supertag
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "parent1",
        "Parent Node",
        null,
      ]);

      // Child node
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "child1",
        "Child Note",
        "parent1",
      ]);

      const result = buildContextualizedNode(db, "child1", "Child Note");

      expect(result.contextText).toBe("Child Note");
      expect(result.ancestorId).toBeNull();
    });
  });

  describe("node with own supertag", () => {
    it("should format as 'Tag: NodeName' when node itself has supertag", () => {
      // Insert node with supertag
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "node1",
        "Website Redesign",
        null,
      ]);
      db.run(
        "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
        ["tag1", "node1", "project"]
      );

      const result = buildContextualizedNode(db, "node1", "Website Redesign");

      expect(result).toEqual({
        nodeId: "node1",
        nodeName: "Website Redesign",
        ancestorId: null, // No separate ancestor - node is its own context
        ancestorName: null,
        ancestorTags: ["project"],
        contextText: "Project: Website Redesign",
      });
    });

    it("should capitalize tag name in context", () => {
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "node1",
        "Fix the bug",
        null,
      ]);
      db.run(
        "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
        ["tag1", "node1", "todo"]
      );

      const result = buildContextualizedNode(db, "node1", "Fix the bug");

      expect(result.contextText).toBe("Todo: Fix the bug");
    });
  });

  describe("node with ancestor supertag", () => {
    it("should format as 'Tag: AncestorName | NodeName' with ancestor context", () => {
      // Insert ancestor with supertag
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "ancestor1",
        "Q4 Planning",
        null,
      ]);
      db.run(
        "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
        ["tag1", "ancestor1", "meeting"]
      );

      // Insert child node (no supertag)
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "child1",
        "Good point about testing",
        "ancestor1",
      ]);

      const result = buildContextualizedNode(
        db,
        "child1",
        "Good point about testing"
      );

      expect(result).toEqual({
        nodeId: "child1",
        nodeName: "Good point about testing",
        ancestorId: "ancestor1",
        ancestorName: "Q4 Planning",
        ancestorTags: ["meeting"],
        contextText: "Meeting: Q4 Planning | Good point about testing",
      });
    });

    it("should find grandparent supertag when parent has none", () => {
      // Grandparent with supertag
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "grandparent",
        "Website Redesign",
        null,
      ]);
      db.run(
        "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
        ["tag1", "grandparent", "project"]
      );

      // Parent without supertag
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "parent",
        "Tasks",
        "grandparent",
      ]);

      // Child node
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "child",
        "Review the proposal",
        "parent",
      ]);

      const result = buildContextualizedNode(
        db,
        "child",
        "Review the proposal"
      );

      expect(result.ancestorId).toBe("grandparent");
      expect(result.contextText).toBe(
        "Project: Website Redesign | Review the proposal"
      );
    });

    it("should use nearest ancestor when multiple ancestors have supertags", () => {
      // Grandparent with project tag
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "grandparent",
        "Website Redesign",
        null,
      ]);
      db.run(
        "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
        ["tag1", "grandparent", "project"]
      );

      // Parent with task tag (nearer ancestor)
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "parent",
        "Update homepage",
        "grandparent",
      ]);
      db.run(
        "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
        ["tag2", "parent", "task"]
      );

      // Child node
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "child",
        "Add hero image",
        "parent",
      ]);

      const result = buildContextualizedNode(db, "child", "Add hero image");

      // Should use parent (task) not grandparent (project)
      expect(result.ancestorId).toBe("parent");
      expect(result.ancestorName).toBe("Update homepage");
      expect(result.ancestorTags).toEqual(["task"]);
      expect(result.contextText).toBe("Task: Update homepage | Add hero image");
    });
  });

  describe("edge cases", () => {
    it("should handle node not in database", () => {
      // Node doesn't exist in database
      const result = buildContextualizedNode(
        db,
        "nonexistent",
        "Some Node Name"
      );

      expect(result.contextText).toBe("Some Node Name");
      expect(result.ancestorId).toBeNull();
    });

    it("should handle special characters in names", () => {
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "node1",
        'Node with "quotes" & special <chars>',
        null,
      ]);
      db.run(
        "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
        ["tag1", "node1", "note"]
      );

      const result = buildContextualizedNode(
        db,
        "node1",
        'Node with "quotes" & special <chars>'
      );

      expect(result.contextText).toBe(
        'Note: Node with "quotes" & special <chars>'
      );
    });

    it("should handle empty node name", () => {
      db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
        "node1",
        "",
        null,
      ]);

      const result = buildContextualizedNode(db, "node1", "");

      expect(result.contextText).toBe("");
    });
  });
});

describe("batchContextualizeNodes", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        parent_id TEXT
      );
      CREATE TABLE tag_applications (
        tag_node_id TEXT,
        data_node_id TEXT,
        tag_name TEXT,
        PRIMARY KEY (tag_node_id, data_node_id)
      );
    `);
  });

  afterEach(() => {
    db.close();
  });

  it("should contextualize multiple nodes", () => {
    // Setup - company with contact tag
    db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
      "company1",
      "Switch",
      null,
    ]);
    db.run(
      "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
      ["tag1", "company1", "contact"]
    );

    // Two people under the company
    db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
      "person1",
      "Monika Stucki",
      "company1",
    ]);
    db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
      "person2",
      "Michael Hausding",
      "company1",
    ]);

    const nodes = [
      { id: "person1", name: "Monika Stucki" },
      { id: "person2", name: "Michael Hausding" },
    ];

    const results = batchContextualizeNodes(db, nodes);

    expect(results.length).toBe(2);
    expect(results[0].contextText).toBe("Contact: Switch | Monika Stucki");
    expect(results[1].contextText).toBe("Contact: Switch | Michael Hausding");

    // Both should reference the same ancestor
    expect(results[0].ancestorId).toBe("company1");
    expect(results[1].ancestorId).toBe("company1");
  });

  it("should handle empty input", () => {
    const results = batchContextualizeNodes(db, []);
    expect(results).toEqual([]);
  });

  it("should handle mixed nodes with and without ancestors", () => {
    // Node with its own tag
    db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
      "node1",
      "Buy groceries",
      null,
    ]);
    db.run(
      "INSERT INTO tag_applications (tag_node_id, data_node_id, tag_name) VALUES (?, ?, ?)",
      ["tag1", "node1", "todo"]
    );

    // Another node without supertag
    db.run("INSERT INTO nodes (id, name, parent_id) VALUES (?, ?, ?)", [
      "node2",
      "Random note",
      null,
    ]);

    const nodes = [
      { id: "node1", name: "Buy groceries" },
      { id: "node2", name: "Random note" },
    ];

    const results = batchContextualizeNodes(db, nodes);

    expect(results[0].contextText).toBe("Todo: Buy groceries");
    expect(results[1].contextText).toBe("Random note");
  });
});
