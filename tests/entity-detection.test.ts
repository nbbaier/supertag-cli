/**
 * Entity Detection Tests
 *
 * Tests for entity detection based on Tana developer insights:
 * - props._entityOverride - Explicit user signal (takes precedence)
 * - props._flags % 2 === 1 - Automatic entity flag (LSB set, uses underscore prefix)
 *
 * Tana export uses _flags (with underscore prefix). We also test
 * inferred entity detection:
 * - Tagged items (has supertag applied)
 * - Library items (_ownerId ends with _STASH)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import {
  isEntity,
  isEntityById,
  findNearestEntityAncestor,
  getEntityStats,
  ENTITY_FILTER_SQL,
} from "../src/db/entity";

describe("Entity Detection - isEntity helper", () => {
  test("should return true when _entityOverride is true", () => {
    expect(isEntity({ _entityOverride: true })).toBe(true);
  });

  test("should return false when _entityOverride is false", () => {
    expect(isEntity({ _entityOverride: false })).toBe(false);
  });

  test("should return true when _flags LSB is set (odd number)", () => {
    expect(isEntity({ _flags: 1 })).toBe(true);
    expect(isEntity({ _flags: 3 })).toBe(true);
    expect(isEntity({ _flags: 5 })).toBe(true);
    expect(isEntity({ _flags: 255 })).toBe(true);
  });

  test("should return false when _flags LSB is not set (even number)", () => {
    expect(isEntity({ _flags: 0 })).toBe(false);
    expect(isEntity({ _flags: 2 })).toBe(false);
    expect(isEntity({ _flags: 4 })).toBe(false);
    expect(isEntity({ _flags: 256 })).toBe(false);
  });

  test("should return true for library items (_STASH owner)", () => {
    expect(isEntity({ _ownerId: "abc123_STASH" })).toBe(true);
    expect(isEntity({ _ownerId: "user_STASH" })).toBe(true);
  });

  test("should return false for non-library items", () => {
    expect(isEntity({ _ownerId: "abc123" })).toBe(false);
    expect(isEntity({ _ownerId: "user_TRASH" })).toBe(false);
  });

  test("should return false when no signals available", () => {
    expect(isEntity({})).toBe(false);
  });

  test("_entityOverride takes precedence over _flags", () => {
    // Even with _flags indicating entity, override wins
    expect(isEntity({ _entityOverride: false, _flags: 1 })).toBe(false);
    expect(isEntity({ _entityOverride: true, _flags: 0 })).toBe(true);
  });
});

describe("Entity Detection - Database Functions", () => {
  let db: Database;

  beforeAll(() => {
    // Create in-memory database with test data
    db = new Database(":memory:");

    // Create nodes table
    db.run(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        parent_id TEXT,
        raw_data TEXT
      )
    `);

    // Create tag_applications table
    db.run(`
      CREATE TABLE tag_applications (
        id INTEGER PRIMARY KEY,
        data_node_id TEXT,
        tag_node_id TEXT,
        tag_name TEXT
      )
    `);

    // Insert test nodes
    const insertNode = db.prepare(
      "INSERT INTO nodes (id, name, parent_id, raw_data) VALUES (?, ?, ?, ?)"
    );

    // Node with _entityOverride = true
    insertNode.run(
      "entity-override",
      "Entity Override Node",
      null,
      JSON.stringify({ props: { _entityOverride: true } })
    );

    // Node with _flags LSB set
    insertNode.run(
      "entity-flags",
      "Entity Flags Node",
      null,
      JSON.stringify({ props: { _flags: 3 } })
    );

    // Node in library (_STASH)
    insertNode.run(
      "entity-library",
      "Library Node",
      null,
      JSON.stringify({ props: { _ownerId: "user_STASH" } })
    );

    // Node with tag (will add tag separately)
    insertNode.run(
      "entity-tagged",
      "Tagged Node",
      null,
      JSON.stringify({ props: {} })
    );

    // Non-entity node
    insertNode.run(
      "non-entity",
      "Regular Node",
      null,
      JSON.stringify({ props: { _flags: 0 } })
    );

    // Child node with entity parent
    insertNode.run(
      "child-of-entity",
      "Child Node",
      "entity-override",
      JSON.stringify({ props: {} })
    );

    // Grandchild node
    insertNode.run(
      "grandchild",
      "Grandchild Node",
      "child-of-entity",
      JSON.stringify({ props: {} })
    );

    // Add tag to entity-tagged
    db.run(
      "INSERT INTO tag_applications (data_node_id, tag_node_id, tag_name) VALUES (?, ?, ?)",
      ["entity-tagged", "tag-def-1", "project"]
    );
  });

  afterAll(() => {
    db.close();
  });

  test("isEntityById should detect entity by _entityOverride", () => {
    expect(isEntityById(db, "entity-override")).toBe(true);
  });

  test("isEntityById should detect entity by _flags", () => {
    expect(isEntityById(db, "entity-flags")).toBe(true);
  });

  test("isEntityById should detect entity by library ownership", () => {
    expect(isEntityById(db, "entity-library")).toBe(true);
  });

  test("isEntityById should detect entity by tag", () => {
    expect(isEntityById(db, "entity-tagged")).toBe(true);
  });

  test("isEntityById should return false for non-entity", () => {
    expect(isEntityById(db, "non-entity")).toBe(false);
  });

  test("isEntityById should return false for non-existent node", () => {
    expect(isEntityById(db, "does-not-exist")).toBe(false);
  });

  test("findNearestEntityAncestor should find parent entity", () => {
    const result = findNearestEntityAncestor(db, "child-of-entity");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("entity-override");
    expect(result?.depth).toBe(1);
  });

  test("findNearestEntityAncestor should find grandparent entity", () => {
    const result = findNearestEntityAncestor(db, "grandchild");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("entity-override");
    expect(result?.depth).toBe(2);
  });

  test("findNearestEntityAncestor should return self if entity", () => {
    const result = findNearestEntityAncestor(db, "entity-override");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("entity-override");
    expect(result?.depth).toBe(0);
  });

  test("findNearestEntityAncestor should return null for non-entity without entity ancestor", () => {
    const result = findNearestEntityAncestor(db, "non-entity");
    expect(result).toBeNull();
  });

  test("getEntityStats should return correct counts", () => {
    const stats = getEntityStats(db);

    expect(stats.totalNodes).toBe(7); // All nodes we created
    expect(stats.entitiesTagged).toBe(1); // Only entity-tagged
    expect(stats.entitiesLibrary).toBe(1); // Only entity-library
    // Note: total includes tagged + library when no flags/override data
  });

  test("ENTITY_FILTER_SQL should filter entities correctly", () => {
    const result = db
      .query(
        `SELECT COUNT(*) as count FROM nodes n WHERE ${ENTITY_FILTER_SQL}`
      )
      .get() as { count: number };

    // Should find: entity-override, entity-flags, entity-library, entity-tagged
    expect(result.count).toBe(4);
  });
});

describe("Entity Detection - Edge Cases", () => {
  let db: Database;

  beforeAll(() => {
    db = new Database(":memory:");

    db.run(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        parent_id TEXT,
        raw_data TEXT
      )
    `);

    db.run(`
      CREATE TABLE tag_applications (
        id INTEGER PRIMARY KEY,
        data_node_id TEXT,
        tag_node_id TEXT,
        tag_name TEXT
      )
    `);
  });

  afterAll(() => {
    db.close();
  });

  test("should handle node with null raw_data", () => {
    db.run(
      "INSERT INTO nodes (id, name, parent_id, raw_data) VALUES (?, ?, ?, ?)",
      ["null-data", "Null Data Node", null, null]
    );

    expect(isEntityById(db, "null-data")).toBe(false);
  });

  test("should handle node with empty props", () => {
    db.run(
      "INSERT INTO nodes (id, name, parent_id, raw_data) VALUES (?, ?, ?, ?)",
      ["empty-props", "Empty Props Node", null, JSON.stringify({ props: {} })]
    );

    expect(isEntityById(db, "empty-props")).toBe(false);
  });

  test("should handle node with multiple tags", () => {
    db.run(
      "INSERT INTO nodes (id, name, parent_id, raw_data) VALUES (?, ?, ?, ?)",
      ["multi-tag", "Multi Tag Node", null, JSON.stringify({ props: {} })]
    );

    db.run(
      "INSERT INTO tag_applications (data_node_id, tag_node_id, tag_name) VALUES (?, ?, ?)",
      ["multi-tag", "tag-1", "project"]
    );
    db.run(
      "INSERT INTO tag_applications (data_node_id, tag_node_id, tag_name) VALUES (?, ?, ?)",
      ["multi-tag", "tag-2", "todo"]
    );

    expect(isEntityById(db, "multi-tag")).toBe(true);
  });
});
