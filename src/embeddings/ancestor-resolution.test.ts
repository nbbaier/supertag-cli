/**
 * TDD Tests for Ancestor Resolution
 *
 * Tests for finding meaningful ancestors (nodes with supertags)
 * when semantic search matches a deeply nested node.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { findMeaningfulAncestor, type AncestorResult } from "./ancestor-resolution";

describe("findMeaningfulAncestor", () => {
  let db: Database;

  beforeAll(() => {
    // Create in-memory database with test data
    db = new Database(":memory:");

    // Create tables
    db.run(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        parent_id TEXT,
        node_type TEXT,
        created INTEGER,
        raw_data TEXT
      )
    `);

    db.run(`
      CREATE TABLE tag_applications (
        id INTEGER PRIMARY KEY,
        tag_node_id TEXT,
        tag_name TEXT,
        data_node_id TEXT
      )
    `);

    // Insert test hierarchy:
    // root (no tag)
    //   └── project1 (#project)
    //       └── section1 (no tag)
    //           └── note1 (no tag)
    //               └── fragment1 (no tag) <- This is what gets matched

    db.run(`INSERT INTO nodes (id, name, parent_id, node_type, raw_data) VALUES
      ('root', 'My Workspace', NULL, 'node', '{}'),
      ('project1', 'Deep Work Book Notes', 'root', 'node', '{}'),
      ('section1', 'Chapter 3: Slow Productivity', 'project1', 'node', '{}'),
      ('note1', 'Key Insights', 'section1', 'node', '{}'),
      ('fragment1', 'generally can support slow productivity...', 'note1', 'node', '{}')`);

    // Add supertag to project1
    db.run(`INSERT INTO tag_applications (tag_node_id, tag_name, data_node_id) VALUES
      ('tag_project', 'project', 'project1')`);
  });

  afterAll(() => {
    db.close();
  });

  it("should find ancestor with supertag", () => {
    const result = findMeaningfulAncestor(db, "fragment1");

    expect(result).not.toBeNull();
    expect(result!.ancestor.id).toBe("project1");
    expect(result!.ancestor.name).toBe("Deep Work Book Notes");
    expect(result!.ancestor.tags).toContain("project");
  });

  it("should include path from ancestor to matched node", () => {
    const result = findMeaningfulAncestor(db, "fragment1");

    expect(result).not.toBeNull();
    expect(result!.path).toEqual([
      "Chapter 3: Slow Productivity",
      "Key Insights",
      "generally can support slow productivity...",
    ]);
  });

  it("should include depth (number of levels traversed)", () => {
    const result = findMeaningfulAncestor(db, "fragment1");

    expect(result).not.toBeNull();
    expect(result!.depth).toBe(3); // project1 -> section1 -> note1 -> fragment1
  });

  it("should return null if no ancestor has supertag", () => {
    // Insert orphan node with no tagged ancestors
    db.run(`INSERT INTO nodes (id, name, parent_id, node_type, raw_data) VALUES
      ('orphan', 'Orphan Node', 'root', 'node', '{}')`);

    const result = findMeaningfulAncestor(db, "orphan");

    expect(result).toBeNull();
  });

  it("should return self if matched node has supertag", () => {
    const result = findMeaningfulAncestor(db, "project1");

    expect(result).not.toBeNull();
    expect(result!.ancestor.id).toBe("project1");
    expect(result!.path).toEqual(["Deep Work Book Notes"]);
    expect(result!.depth).toBe(0);
  });

  it("should handle multiple supertags on ancestor", () => {
    // Add another tag to project1
    db.run(`INSERT INTO tag_applications (tag_node_id, tag_name, data_node_id) VALUES
      ('tag_book', 'book', 'project1')`);

    const result = findMeaningfulAncestor(db, "fragment1");

    expect(result).not.toBeNull();
    expect(result!.ancestor.tags).toContain("project");
    expect(result!.ancestor.tags).toContain("book");
  });

  it("should stop at first ancestor with supertag (nearest)", () => {
    // Add supertag to section1 (closer than project1)
    db.run(`INSERT INTO tag_applications (tag_node_id, tag_name, data_node_id) VALUES
      ('tag_chapter', 'chapter', 'section1')`);

    const result = findMeaningfulAncestor(db, "fragment1");

    expect(result).not.toBeNull();
    expect(result!.ancestor.id).toBe("section1");
    expect(result!.ancestor.name).toBe("Chapter 3: Slow Productivity");
    expect(result!.depth).toBe(2); // section1 -> note1 -> fragment1
  });

  it("should handle max depth limit to prevent infinite loops", () => {
    // Create deep chain
    let parentId = "root";
    for (let i = 0; i < 100; i++) {
      const nodeId = `deep_${i}`;
      db.run(`INSERT INTO nodes (id, name, parent_id, node_type, raw_data) VALUES
        (?, ?, ?, 'node', '{}')`, [nodeId, `Deep Node ${i}`, parentId]);
      parentId = nodeId;
    }

    // Should return null (no tagged ancestor within reasonable depth)
    const result = findMeaningfulAncestor(db, "deep_99", 50);

    expect(result).toBeNull();
  });
});

describe("findMeaningfulAncestor - edge cases", () => {
  let db: Database;

  beforeAll(() => {
    db = new Database(":memory:");

    db.run(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        parent_id TEXT,
        node_type TEXT,
        created INTEGER,
        raw_data TEXT
      )
    `);

    db.run(`
      CREATE TABLE tag_applications (
        id INTEGER PRIMARY KEY,
        tag_node_id TEXT,
        tag_name TEXT,
        data_node_id TEXT
      )
    `);
  });

  afterAll(() => {
    db.close();
  });

  it("should return null for non-existent node", () => {
    const result = findMeaningfulAncestor(db, "nonexistent");
    expect(result).toBeNull();
  });

  it("should handle node with null parent_id", () => {
    db.run(`INSERT INTO nodes (id, name, parent_id, node_type, raw_data) VALUES
      ('root_node', 'Root', NULL, 'node', '{}')`);

    const result = findMeaningfulAncestor(db, "root_node");
    expect(result).toBeNull();
  });

  it("should handle circular reference gracefully", () => {
    // Create circular reference (shouldn't happen in real data but be defensive)
    db.run(`INSERT INTO nodes (id, name, parent_id, node_type, raw_data) VALUES
      ('circular_a', 'Node A', 'circular_b', 'node', '{}'),
      ('circular_b', 'Node B', 'circular_a', 'node', '{}')`);

    // Should not hang, should return null
    const result = findMeaningfulAncestor(db, "circular_a", 10);
    expect(result).toBeNull();
  });
});
