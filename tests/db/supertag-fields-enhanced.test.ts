/**
 * Tests for enhanced supertag_fields columns
 * Spec 020: Schema Consolidation - T-1.2
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import * as schema from "../../src/db/schema";

describe("supertag_fields enhanced columns", () => {
  let sqlite: Database;

  beforeEach(() => {
    sqlite = new Database(":memory:");

    // Create the table with enhanced columns
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS supertag_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_label_id TEXT NOT NULL,
        field_order INTEGER DEFAULT 0,
        normalized_name TEXT,
        description TEXT,
        inferred_data_type TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_supertag_fields_normalized ON supertag_fields(normalized_name);
      CREATE INDEX IF NOT EXISTS idx_supertag_fields_data_type ON supertag_fields(inferred_data_type);
    `);
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should have normalized_name column in schema", () => {
    const supertagFieldsSchema = schema.supertagFields;
    expect(supertagFieldsSchema.normalizedName).toBeDefined();
  });

  it("should have description column in schema", () => {
    const supertagFieldsSchema = schema.supertagFields;
    expect(supertagFieldsSchema.description).toBeDefined();
  });

  it("should have inferredDataType column in schema", () => {
    const supertagFieldsSchema = schema.supertagFields;
    expect(supertagFieldsSchema.inferredDataType).toBeDefined();
  });

  it("should allow storing normalized_name", () => {
    sqlite.exec(`
      INSERT INTO supertag_fields (tag_id, tag_name, field_name, field_label_id, normalized_name)
      VALUES ('tag1', 'Todo', 'Due Date', 'field1', 'duedate')
    `);

    const result = sqlite.query("SELECT normalized_name FROM supertag_fields WHERE tag_id = 'tag1'").get() as {
      normalized_name: string;
    };

    expect(result.normalized_name).toBe("duedate");
  });

  it("should allow storing description", () => {
    sqlite.exec(`
      INSERT INTO supertag_fields (tag_id, tag_name, field_name, field_label_id, description)
      VALUES ('tag1', 'Todo', 'Due Date', 'field1', 'When the task is due')
    `);

    const result = sqlite.query("SELECT description FROM supertag_fields WHERE tag_id = 'tag1'").get() as {
      description: string;
    };

    expect(result.description).toBe("When the task is due");
  });

  it("should allow storing inferred_data_type", () => {
    sqlite.exec(`
      INSERT INTO supertag_fields (tag_id, tag_name, field_name, field_label_id, inferred_data_type)
      VALUES ('tag1', 'Todo', 'Due Date', 'field1', 'date')
    `);

    const result = sqlite.query("SELECT inferred_data_type FROM supertag_fields WHERE tag_id = 'tag1'").get() as {
      inferred_data_type: string;
    };

    expect(result.inferred_data_type).toBe("date");
  });

  it("should support all data type values", () => {
    const dataTypes = ["text", "date", "reference", "url", "number", "checkbox"];

    for (const dataType of dataTypes) {
      sqlite.exec(`
        INSERT INTO supertag_fields (tag_id, tag_name, field_name, field_label_id, inferred_data_type)
        VALUES ('tag_${dataType}', 'Test', 'Field', 'field_${dataType}', '${dataType}')
      `);
    }

    const results = sqlite.query("SELECT inferred_data_type FROM supertag_fields").all() as Array<{
      inferred_data_type: string;
    }>;

    const types = results.map(r => r.inferred_data_type);
    expect(types).toEqual(expect.arrayContaining(dataTypes));
  });
});
