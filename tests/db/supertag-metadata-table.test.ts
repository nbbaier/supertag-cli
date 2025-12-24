/**
 * Tests for supertag_metadata table
 * Spec 020: Schema Consolidation - T-1.1
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sql } from "drizzle-orm";
import * as schema from "../../src/db/schema";

describe("supertag_metadata table", () => {
  let sqlite: Database;
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });

    // Create the table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS supertag_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_id TEXT NOT NULL UNIQUE,
        tag_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        created_at INTEGER DEFAULT (strftime('%s','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_supertag_metadata_name ON supertag_metadata(tag_name);
      CREATE INDEX IF NOT EXISTS idx_supertag_metadata_normalized ON supertag_metadata(normalized_name);
    `);
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should have supertag_metadata table defined in schema", () => {
    expect(schema.supertagMetadata).toBeDefined();
  });

  it("should have correct columns", () => {
    const columns = sqlite.query("PRAGMA table_info(supertag_metadata)").all() as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;

    const columnNames = columns.map(c => c.name);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("tag_id");
    expect(columnNames).toContain("tag_name");
    expect(columnNames).toContain("normalized_name");
    expect(columnNames).toContain("description");
    expect(columnNames).toContain("color");
    expect(columnNames).toContain("created_at");
  });

  it("should enforce unique constraint on tag_id", () => {
    sqlite.exec(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('tag1', 'Todo', 'todo')
    `);

    expect(() => {
      sqlite.exec(`
        INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
        VALUES ('tag1', 'Todo Duplicate', 'tododuplicate')
      `);
    }).toThrow();
  });

  it("should allow null description and color", () => {
    sqlite.exec(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('tag2', 'Meeting', 'meeting')
    `);

    const result = sqlite.query("SELECT * FROM supertag_metadata WHERE tag_id = 'tag2'").get() as {
      description: string | null;
      color: string | null;
    };

    expect(result.description).toBeNull();
    expect(result.color).toBeNull();
  });

  it("should store description and color when provided", () => {
    sqlite.exec(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name, description, color)
      VALUES ('tag3', 'Project', 'project', 'A project tag', '#FF5733')
    `);

    const result = sqlite.query("SELECT * FROM supertag_metadata WHERE tag_id = 'tag3'").get() as {
      description: string;
      color: string;
    };

    expect(result.description).toBe("A project tag");
    expect(result.color).toBe("#FF5733");
  });

  it("should have indexes for efficient lookup", () => {
    const indexes = sqlite.query("PRAGMA index_list(supertag_metadata)").all() as Array<{
      name: string;
    }>;

    const indexNames = indexes.map(i => i.name);
    expect(indexNames.some(n => n.includes("name"))).toBe(true);
    expect(indexNames.some(n => n.includes("normalized"))).toBe(true);
  });
});
