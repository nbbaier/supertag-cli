/**
 * Schema Cache Generation Tests (Spec 020 T-4.2)
 *
 * TDD tests for generating schema-registry.json cache file
 * from the database using UnifiedSchemaService.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { migrateSchemaConsolidation, migrateSupertagMetadataSchema } from "../../src/db/migrate";
import { UnifiedSchemaService } from "../../src/services/unified-schema-service";

describe("generateSchemaCache (T-4.2)", () => {
  let db: Database;
  let service: UnifiedSchemaService;
  let testDir: string;
  let cacheFilePath: string;

  beforeAll(() => {
    db = new Database(":memory:");
    migrateSupertagMetadataSchema(db);
    migrateSchemaConsolidation(db);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    // Clear data before each test
    db.run("DELETE FROM supertag_metadata");
    db.run("DELETE FROM supertag_fields");
    db.run("DELETE FROM supertag_parents");
    service = new UnifiedSchemaService(db);

    // Create temp directory for cache files
    testDir = join("/tmp", `supertag-cache-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    cacheFilePath = join(testDir, "schema-registry.json");
  });

  afterEach(() => {
    // Clean up temp directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("file writing", () => {
    it("should write cache file to specified path", async () => {
      await service.generateSchemaCache(cacheFilePath);
      expect(existsSync(cacheFilePath)).toBe(true);
    });

    it("should create parent directories if they don't exist", async () => {
      const nestedPath = join(testDir, "nested", "dir", "schema-registry.json");
      await service.generateSchemaCache(nestedPath);
      expect(existsSync(nestedPath)).toBe(true);
    });

    it("should overwrite existing cache file", async () => {
      // Write initial cache
      await service.generateSchemaCache(cacheFilePath);

      // Add data and regenerate
      db.run(`
        INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
        VALUES ('tag1', 'contact', 'contact')
      `);

      await service.generateSchemaCache(cacheFilePath);

      // Verify new data is in file
      const file = Bun.file(cacheFilePath);
      const data = await file.json();
      expect(data.supertags).toHaveLength(1);
    });
  });

  describe("file content", () => {
    it("should write valid JSON", async () => {
      await service.generateSchemaCache(cacheFilePath);

      const file = Bun.file(cacheFilePath);
      const text = await file.text();
      expect(() => JSON.parse(text)).not.toThrow();
    });

    it("should have version field set to 1", async () => {
      await service.generateSchemaCache(cacheFilePath);

      const file = Bun.file(cacheFilePath);
      const data = await file.json();
      expect(data.version).toBe(1);
    });

    it("should contain all supertags from database", async () => {
      db.run(`
        INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
        VALUES ('tag1', 'meeting', 'meeting'),
               ('tag2', 'contact', 'contact'),
               ('tag3', 'project', 'project')
      `);

      await service.generateSchemaCache(cacheFilePath);

      const file = Bun.file(cacheFilePath);
      const data = await file.json();
      expect(data.supertags).toHaveLength(3);
    });

    it("should include fields for each supertag", async () => {
      db.run(`
        INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
        VALUES ('contact-id', 'contact', 'contact')
      `);
      db.run(`
        INSERT INTO supertag_fields (tag_id, tag_name, field_name, field_label_id, field_order, normalized_name, inferred_data_type)
        VALUES ('contact-id', 'contact', 'Email', 'email-attr', 0, 'email', 'text'),
               ('contact-id', 'contact', 'Phone', 'phone-attr', 1, 'phone', 'text')
      `);

      await service.generateSchemaCache(cacheFilePath);

      const file = Bun.file(cacheFilePath);
      const data = await file.json();
      expect(data.supertags[0].fields).toHaveLength(2);
    });

    it("should be loadable by SchemaRegistry.fromJSON", async () => {
      db.run(`
        INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name, description, color)
        VALUES ('contact-id', 'contact', 'contact', 'A contact', 'blue')
      `);
      db.run(`
        INSERT INTO supertag_fields (tag_id, tag_name, field_name, field_label_id, field_order, normalized_name, inferred_data_type)
        VALUES ('contact-id', 'contact', 'Email', 'email-attr', 0, 'email', 'text')
      `);

      await service.generateSchemaCache(cacheFilePath);

      // Load with SchemaRegistry
      const file = Bun.file(cacheFilePath);
      const json = await file.text();

      const { SchemaRegistry } = await import("../../src/schema/registry");
      const registry = SchemaRegistry.fromJSON(json);

      const contact = registry.getSupertag("contact");
      expect(contact).not.toBeUndefined();
      expect(contact!.id).toBe("contact-id");
      expect(contact!.fields).toHaveLength(1);
      expect(contact!.fields[0].attributeId).toBe("email-attr");
    });
  });

  describe("return value", () => {
    it("should return the file path written", async () => {
      const result = await service.generateSchemaCache(cacheFilePath);
      expect(result).toBe(cacheFilePath);
    });
  });

  describe("empty database", () => {
    it("should write cache with empty supertags array", async () => {
      await service.generateSchemaCache(cacheFilePath);

      const file = Bun.file(cacheFilePath);
      const data = await file.json();
      expect(data.version).toBe(1);
      expect(data.supertags).toEqual([]);
    });
  });
});
