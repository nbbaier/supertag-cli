/**
 * Tests for F-094: @Name Reference Resolution
 *
 * Tests the ability to resolve references by name using the @Name syntax,
 * matching Tana's native @mention behavior.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { UnifiedSchemaService } from "../src/services/unified-schema-service";

describe("F-094: @Name Reference Resolution", () => {
  let db: Database;
  let service: UnifiedSchemaService;

  beforeAll(() => {
    // Create in-memory database with test data
    db = new Database(":memory:");

    // Create required tables
    db.run(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        raw_data TEXT
      )
    `);

    // supertag_metadata table (used by getSupertag)
    db.run(`
      CREATE TABLE supertag_metadata (
        tag_id TEXT PRIMARY KEY,
        tag_name TEXT,
        normalized_name TEXT,
        description TEXT,
        color TEXT
      )
    `);

    db.run(`
      CREATE TABLE tag_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_node_id TEXT,
        tag_id TEXT,
        tag_name TEXT
      )
    `);

    db.run(`
      CREATE TABLE supertag_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_id TEXT,
        field_label_id TEXT,
        field_name TEXT,
        normalized_name TEXT,
        description TEXT,
        inferred_data_type TEXT,
        target_supertag_id TEXT,
        target_supertag_name TEXT,
        field_order INTEGER DEFAULT 0,
        default_value_id TEXT,
        default_value_text TEXT
      )
    `);

    // supertag_parents for inheritance (used by getAllFields)
    db.run(`
      CREATE TABLE supertag_parents (
        child_tag_id TEXT,
        parent_tag_id TEXT,
        depth INTEGER DEFAULT 1
      )
    `);

    // Insert test nodes
    db.run(`INSERT INTO nodes (id, name) VALUES ('node-open-123', 'Open')`);
    db.run(`INSERT INTO nodes (id, name) VALUES ('node-closed-456', 'Closed')`);
    db.run(`INSERT INTO nodes (id, name) VALUES ('node-superceded-789', 'Superceded')`);
    db.run(`INSERT INTO nodes (id, name) VALUES ('node-wontdo-abc', "Won't Do")`);
    db.run(`INSERT INTO nodes (id, name) VALUES ('node-john-doe', 'John Doe')`);
    db.run(`INSERT INTO nodes (id, name) VALUES ('node-jane-doe', 'Jane Doe')`);
    db.run(`INSERT INTO nodes (id, name) VALUES ('untagged-node-xyz', 'Some Random Node')`);

    // Insert test supertag (state)
    db.run(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('state-tag-id', 'State', 'state')
    `);

    // Insert test supertag (person)
    db.run(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('person-tag-id', 'Person', 'person')
    `);

    // Insert test supertag (task) with State field
    db.run(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('task-tag-id', 'Task', 'task')
    `);

    // Add State field to Task supertag (options field targeting State supertag)
    db.run(`
      INSERT INTO supertag_fields (tag_id, field_label_id, field_name, normalized_name, inferred_data_type, target_supertag_id, field_order)
      VALUES ('task-tag-id', 'state-attr-id', 'State', 'state', 'options', 'state-tag-id', 1)
    `);

    // Add Owner field to Task supertag (reference field targeting Person supertag)
    db.run(`
      INSERT INTO supertag_fields (tag_id, field_label_id, field_name, normalized_name, inferred_data_type, target_supertag_id, field_order)
      VALUES ('task-tag-id', 'owner-attr-id', 'Owner', 'owner', 'reference', 'person-tag-id', 2)
    `);

    // Add Notes field to Task (plain text, no target supertag)
    db.run(`
      INSERT INTO supertag_fields (tag_id, field_label_id, field_name, normalized_name, inferred_data_type, field_order)
      VALUES ('task-tag-id', 'notes-attr-id', 'Notes', 'notes', NULL, 3)
    `);

    // Tag the state nodes with State supertag
    db.run(`INSERT INTO tag_applications (data_node_id, tag_id, tag_name) VALUES ('node-open-123', 'state-tag-id', 'State')`);
    db.run(`INSERT INTO tag_applications (data_node_id, tag_id, tag_name) VALUES ('node-closed-456', 'state-tag-id', 'State')`);
    db.run(`INSERT INTO tag_applications (data_node_id, tag_id, tag_name) VALUES ('node-superceded-789', 'state-tag-id', 'State')`);
    db.run(`INSERT INTO tag_applications (data_node_id, tag_id, tag_name) VALUES ('node-wontdo-abc', 'state-tag-id', 'State')`);

    // Tag the person nodes with Person supertag
    db.run(`INSERT INTO tag_applications (data_node_id, tag_id, tag_name) VALUES ('node-john-doe', 'person-tag-id', 'Person')`);
    db.run(`INSERT INTO tag_applications (data_node_id, tag_id, tag_name) VALUES ('node-jane-doe', 'person-tag-id', 'Person')`);

    service = new UnifiedSchemaService(db);
  });

  afterAll(() => {
    db.close();
  });

  describe("resolveReferenceByName", () => {
    test("resolves exact name match", () => {
      const id = service.resolveReferenceByName("Open");
      expect(id).toBe("node-open-123");
    });

    test("resolves name with spaces", () => {
      const id = service.resolveReferenceByName("John Doe");
      expect(id).toBe("node-john-doe");
    });

    test("resolves name with apostrophe", () => {
      const id = service.resolveReferenceByName("Won't Do");
      expect(id).toBe("node-wontdo-abc");
    });

    test("returns null for non-existent name", () => {
      const id = service.resolveReferenceByName("NonExistent");
      expect(id).toBeNull();
    });

    test("returns null for empty name", () => {
      const id = service.resolveReferenceByName("");
      expect(id).toBeNull();
    });

    test("trims whitespace from name", () => {
      const id = service.resolveReferenceByName("  Open  ");
      expect(id).toBe("node-open-123");
    });

    describe("with targetSupertagId filter", () => {
      test("resolves name filtered by supertag", () => {
        // Should find Open tagged with State supertag
        const id = service.resolveReferenceByName("Open", "state-tag-id");
        expect(id).toBe("node-open-123");
      });

      test("does not find node when filtered by wrong supertag", () => {
        // John Doe is tagged with Person, not State
        const id = service.resolveReferenceByName("John Doe", "state-tag-id");
        // Falls back to unfiltered search, finds the node anyway
        expect(id).toBe("node-john-doe");
      });

      test("finds untagged node via fallback", () => {
        // Untagged node should be found via fallback search
        const id = service.resolveReferenceByName("Some Random Node", "state-tag-id");
        expect(id).toBe("untagged-node-xyz");
      });
    });
  });

  describe("buildNodePayload with @Name syntax", () => {
    test("resolves @Name to reference in options field", () => {
      const payload = service.buildNodePayload("task", "Test Task", {
        state: "@Open",
      });

      expect(payload.name).toBe("Test Task");
      expect(payload.children).toBeDefined();
      expect(payload.children!.length).toBeGreaterThanOrEqual(1);

      // Find the state field
      const stateField = payload.children!.find(
        (c: any) => c.type === "field" && c.attributeId === "state-attr-id"
      ) as any;
      expect(stateField).toBeDefined();
      expect(stateField.children).toBeDefined();
      expect(stateField.children.length).toBe(1);
      expect(stateField.children[0].dataType).toBe("reference");
      expect(stateField.children[0].id).toBe("node-open-123");
    });

    test("resolves @Name to reference in reference field", () => {
      const payload = service.buildNodePayload("task", "Test Task", {
        owner: "@John Doe",
      });

      const ownerField = payload.children!.find(
        (c: any) => c.type === "field" && c.attributeId === "owner-attr-id"
      ) as any;
      expect(ownerField).toBeDefined();
      expect(ownerField.children[0].dataType).toBe("reference");
      expect(ownerField.children[0].id).toBe("node-john-doe");
    });

    test("creates new node when @Name not found", () => {
      const payload = service.buildNodePayload("task", "Test Task", {
        state: "@NewState",
      });

      const stateField = payload.children!.find(
        (c: any) => c.type === "field" && c.attributeId === "state-attr-id"
      ) as any;
      expect(stateField).toBeDefined();
      // Should create a new node with the name (without @)
      expect(stateField.children[0].name).toBe("NewState");
      // Should apply target supertag
      expect(stateField.children[0].supertags).toBeDefined();
      expect(stateField.children[0].supertags[0].id).toBe("state-tag-id");
    });

    test("handles multiple @Name values with comma separator", () => {
      // Add Assignees field that allows multiple values
      db.run(`
        INSERT INTO supertag_fields (tag_id, field_label_id, field_name, normalized_name, inferred_data_type, target_supertag_id, field_order)
        VALUES ('task-tag-id', 'assignees-attr-id', 'Assignees', 'assignees', 'reference', 'person-tag-id', 4)
      `);

      const payload = service.buildNodePayload("task", "Test Task", {
        assignees: "@John Doe,@Jane Doe",
      });

      const assigneesField = payload.children!.find(
        (c: any) => c.type === "field" && c.attributeId === "assignees-attr-id"
      ) as any;
      expect(assigneesField).toBeDefined();
      expect(assigneesField.children.length).toBe(2);
      expect(assigneesField.children[0].dataType).toBe("reference");
      expect(assigneesField.children[0].id).toBe("node-john-doe");
      expect(assigneesField.children[1].dataType).toBe("reference");
      expect(assigneesField.children[1].id).toBe("node-jane-doe");
    });

    test("resolves @Name in default field type (no dataType)", () => {
      // For untyped fields, @Name syntax still works for name lookup
      const payload = service.buildNodePayload("task", "Test Task", {
        notes: "@John Doe",
      });

      const notesField = payload.children!.find(
        (c: any) => c.type === "field" && c.attributeId === "notes-attr-id"
      ) as any;
      expect(notesField).toBeDefined();
      // Should resolve the @Name even in untyped field
      expect(notesField.children[0].dataType).toBe("reference");
      expect(notesField.children[0].id).toBe("node-john-doe");
    });

    test("handles mix of @Name and raw node IDs", () => {
      const payload = service.buildNodePayload("task", "Test Task", {
        assignees: "@John Doe,node-jane-doe",
      });

      const assigneesField = payload.children!.find(
        (c: any) => c.type === "field" && c.attributeId === "assignees-attr-id"
      ) as any;
      expect(assigneesField).toBeDefined();
      expect(assigneesField.children.length).toBe(2);
      // First: resolved from @Name
      expect(assigneesField.children[0].dataType).toBe("reference");
      expect(assigneesField.children[0].id).toBe("node-john-doe");
      // Second: raw node ID
      expect(assigneesField.children[1].dataType).toBe("reference");
      expect(assigneesField.children[1].id).toBe("node-jane-doe");
    });

    test("raw node ID still works without @ prefix", () => {
      const payload = service.buildNodePayload("task", "Test Task", {
        state: "node-open-123",
      });

      const stateField = payload.children!.find(
        (c: any) => c.type === "field" && c.attributeId === "state-attr-id"
      ) as any;
      expect(stateField).toBeDefined();
      expect(stateField.children[0].dataType).toBe("reference");
      expect(stateField.children[0].id).toBe("node-open-123");
    });
  });
});
