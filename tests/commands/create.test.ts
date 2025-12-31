/**
 * Create Command Tests (T-5.3)
 *
 * Tests for buildNodePayloadFromDatabase function that uses
 * UnifiedSchemaService.buildNodePayload for database-backed node creation.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { migrateSupertagMetadataSchema, migrateSchemaConsolidation } from "../../src/db/migrate";

describe("buildNodePayloadFromDatabase (T-5.3)", () => {
  let testDir: string;
  let dbPath: string;
  let db: Database;

  beforeEach(() => {
    testDir = join("/tmp", `supertag-create-test-${Date.now()}`);
    dbPath = join(testDir, "tana-index.db");
    mkdirSync(testDir, { recursive: true });

    // Create database with schema
    db = new Database(dbPath);
    migrateSupertagMetadataSchema(db);
    migrateSchemaConsolidation(db);

    // Insert test supertag with fields
    db.run(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('todo-id', 'todo', 'todo')
    `);
    db.run(`
      INSERT INTO supertag_fields (tag_id, tag_name, field_name, field_label_id, field_order, normalized_name, inferred_data_type)
      VALUES
        ('todo-id', 'todo', 'Status', 'status-attr', 0, 'status', 'text'),
        ('todo-id', 'todo', 'Due Date', 'due-attr', 1, 'duedate', 'date')
    `);
  });

  afterEach(() => {
    db.close();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should export buildNodePayloadFromDatabase function", async () => {
    const { buildNodePayloadFromDatabase } = await import("../../src/services/node-builder");
    expect(typeof buildNodePayloadFromDatabase).toBe("function");
  });

  it("should build node payload with supertag from database", async () => {
    const { buildNodePayloadFromDatabase } = await import("../../src/services/node-builder");

    const payload = await buildNodePayloadFromDatabase(dbPath, {
      supertag: "todo",
      name: "Buy groceries",
      fields: {},
    });

    expect(payload.name).toBe("Buy groceries");
    expect(payload.supertags).toBeDefined();
    expect(payload.supertags).toHaveLength(1);
    expect(payload.supertags![0].id).toBe("todo-id");
  });

  it("should build node payload with fields mapped to tuples", async () => {
    const { buildNodePayloadFromDatabase } = await import("../../src/services/node-builder");

    const payload = await buildNodePayloadFromDatabase(dbPath, {
      supertag: "todo",
      name: "Buy groceries",
      fields: { status: "pending" },
    });

    expect(payload.children).toBeDefined();
    // Should have field tuple
    const children = payload.children as Array<{ name?: string; children?: Array<{ name?: string }> }>;
    expect(children.length).toBeGreaterThanOrEqual(1);
  });

  it("should throw for unknown supertag", async () => {
    const { buildNodePayloadFromDatabase } = await import("../../src/services/node-builder");

    await expect(
      buildNodePayloadFromDatabase(dbPath, {
        supertag: "nonexistent",
        name: "Test",
        fields: {},
      })
    ).rejects.toThrow("Unknown supertag");
  });

  it("should handle multiple supertags", async () => {
    // Add another supertag
    db.run(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('project-id', 'project', 'project')
    `);

    const { buildNodePayloadFromDatabase } = await import("../../src/services/node-builder");

    const payload = await buildNodePayloadFromDatabase(dbPath, {
      supertag: "todo,project",
      name: "Project Task",
      fields: {},
    });

    expect(payload.supertags).toHaveLength(2);
    const tagIds = payload.supertags!.map(t => t.id);
    expect(tagIds).toContain("todo-id");
    expect(tagIds).toContain("project-id");
  });

  it("should include children in payload", async () => {
    const { buildNodePayloadFromDatabase } = await import("../../src/services/node-builder");

    const payload = await buildNodePayloadFromDatabase(dbPath, {
      supertag: "todo",
      name: "Parent Task",
      fields: {},
      children: [
        { name: "Child 1" },
        { name: "Child 2" },
      ],
    });

    expect(payload.children).toBeDefined();
    const children = payload.children as Array<{ name?: string }>;
    const childNames = children.filter(c => c.name === "Child 1" || c.name === "Child 2");
    expect(childNames.length).toBe(2);
  });
});
