/**
 * Sync Schema Cache Integration Tests (Spec 020 T-4.3)
 *
 * TDD tests for integrating schema cache generation into sync index command.
 * Verifies that after indexing, the schema cache is generated from the database.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { TanaExportWatcher } from "../../src/monitors/tana-export-monitor";

describe("sync index schema cache integration (T-4.3)", () => {
  let testDir: string;
  let exportDir: string;
  let dbPath: string;
  let schemaCachePath: string;

  beforeEach(() => {
    // Create temp directories
    testDir = join("/tmp", `supertag-sync-test-${Date.now()}`);
    exportDir = join(testDir, "exports");
    dbPath = join(testDir, "tana-index.db");
    schemaCachePath = join(testDir, "schema-registry.json");

    mkdirSync(exportDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create a minimal Tana export with supertags
   */
  function createTestExport(filename: string, supertags: { id: string; name: string; fields?: { name: string; id: string }[] }[]) {
    const docs: Record<string, unknown>[] = [];

    for (const tag of supertags) {
      // Create tagDef node
      const tagDef: Record<string, unknown> = {
        id: tag.id,
        props: {
          _docType: "tagDef",
          name: tag.name,
          created: Date.now(),
        },
        children: [],
      };

      // Add field children if provided
      if (tag.fields) {
        for (const field of tag.fields) {
          // Create field label node
          const fieldLabel = {
            id: field.id,
            props: {
              name: field.name,
              created: Date.now(),
            },
          };
          docs.push(fieldLabel);

          // Create tuple containing field
          const tupleId = `tuple-${field.id}`;
          const tuple = {
            id: tupleId,
            props: {
              _docType: "tuple",
              created: Date.now(),
            },
            children: [field.id],
          };
          docs.push(tuple);

          (tagDef.children as string[]).push(tupleId);
        }
      }

      docs.push(tagDef);
    }

    // Use correct Tana export format with formatVersion, docs, editors, workspaces at root
    const exportData = {
      formatVersion: 1,
      docs,
      editors: [],
      workspaces: {},
    };

    const exportPath = join(exportDir, filename);
    writeFileSync(exportPath, JSON.stringify(exportData));
    return exportPath;
  }

  describe("cache generation after index", () => {
    it("should generate schema cache file after indexing", async () => {
      // Create test export with a supertag
      createTestExport("test@2025-01-01.json", [
        { id: "tag1", name: "contact" },
      ]);

      const watcher = new TanaExportWatcher({
        exportDir,
        dbPath,
        schemaCachePath,
      });

      await watcher.indexLatest();
      watcher.close();

      // Verify schema cache was generated
      expect(existsSync(schemaCachePath)).toBe(true);
    });

    it("should include indexed supertags in cache", async () => {
      createTestExport("test@2025-01-01.json", [
        { id: "tag1", name: "contact" },
        { id: "tag2", name: "meeting" },
      ]);

      const watcher = new TanaExportWatcher({
        exportDir,
        dbPath,
        schemaCachePath,
      });

      await watcher.indexLatest();
      watcher.close();

      // Read and verify cache content
      const cacheContent = JSON.parse(readFileSync(schemaCachePath, "utf-8"));
      expect(cacheContent.version).toBe(1);
      expect(cacheContent.supertags).toHaveLength(2);

      const tagNames = cacheContent.supertags.map((s: { name: string }) => s.name);
      expect(tagNames).toContain("contact");
      expect(tagNames).toContain("meeting");
    });

    it("should include fields in cache", async () => {
      createTestExport("test@2025-01-01.json", [
        {
          id: "tag1",
          name: "contact",
          fields: [
            { id: "field1", name: "Email" },
            { id: "field2", name: "Phone" },
          ],
        },
      ]);

      const watcher = new TanaExportWatcher({
        exportDir,
        dbPath,
        schemaCachePath,
      });

      await watcher.indexLatest();
      watcher.close();

      // Verify fields in cache
      const cacheContent = JSON.parse(readFileSync(schemaCachePath, "utf-8"));
      const contact = cacheContent.supertags.find((s: { name: string }) => s.name === "contact");
      expect(contact).toBeDefined();
      expect(contact.fields).toHaveLength(2);

      const fieldNames = contact.fields.map((f: { name: string }) => f.name);
      expect(fieldNames).toContain("Email");
      expect(fieldNames).toContain("Phone");
    });

    it("should be loadable by SchemaRegistry.fromJSON", async () => {
      createTestExport("test@2025-01-01.json", [
        {
          id: "contact-id",
          name: "contact",
          fields: [{ id: "email-attr", name: "Email" }],
        },
      ]);

      const watcher = new TanaExportWatcher({
        exportDir,
        dbPath,
        schemaCachePath,
      });

      await watcher.indexLatest();
      watcher.close();

      // Load with SchemaRegistry to verify compatibility
      const { SchemaRegistry } = await import("../../src/schema/registry");
      const cacheJson = readFileSync(schemaCachePath, "utf-8");
      const registry = SchemaRegistry.fromJSON(cacheJson);

      const contact = registry.getSupertag("contact");
      expect(contact).toBeDefined();
      expect(contact!.id).toBe("contact-id");
    });
  });

  describe("cache path configuration", () => {
    it("should use configured schemaCachePath if provided", async () => {
      const customCachePath = join(testDir, "custom", "cache.json");

      createTestExport("test@2025-01-01.json", [
        { id: "tag1", name: "project" },
      ]);

      const watcher = new TanaExportWatcher({
        exportDir,
        dbPath,
        schemaCachePath: customCachePath,
      });

      await watcher.indexLatest();
      watcher.close();

      expect(existsSync(customCachePath)).toBe(true);
    });

    it("should create parent directories for cache path", async () => {
      const nestedCachePath = join(testDir, "nested", "deep", "schema.json");

      createTestExport("test@2025-01-01.json", [
        { id: "tag1", name: "todo" },
      ]);

      const watcher = new TanaExportWatcher({
        exportDir,
        dbPath,
        schemaCachePath: nestedCachePath,
      });

      await watcher.indexLatest();
      watcher.close();

      expect(existsSync(nestedCachePath)).toBe(true);
    });
  });

  describe("watch mode", () => {
    it("should generate cache on each index event", async () => {
      createTestExport("test@2025-01-01.json", [
        { id: "tag1", name: "first" },
      ]);

      const watcher = new TanaExportWatcher({
        exportDir,
        dbPath,
        schemaCachePath,
        debounceMs: 100,
      });

      // Index first export
      await watcher.indexLatest();

      // Verify first cache
      let cacheContent = JSON.parse(readFileSync(schemaCachePath, "utf-8"));
      expect(cacheContent.supertags).toHaveLength(1);
      expect(cacheContent.supertags[0].name).toBe("first");

      // Create second export with additional supertag
      createTestExport("test@2025-01-02.json", [
        { id: "tag1", name: "first" },
        { id: "tag2", name: "second" },
      ]);

      // Index second export
      await watcher.indexLatest();
      watcher.close();

      // Verify updated cache
      cacheContent = JSON.parse(readFileSync(schemaCachePath, "utf-8"));
      expect(cacheContent.supertags).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("should not fail indexing if schema cache generation fails", async () => {
      // Use a path that will fail - treating a file as a directory
      // First create the blocker file
      const blockerFile = "/tmp/supertag-test-file-blocker";
      await Bun.write(blockerFile, "");
      const invalidCachePath = `${blockerFile}/subdir/schema.json`;

      createTestExport("test@2025-01-01.json", [
        { id: "tag1", name: "task" },
      ]);

      const watcher = new TanaExportWatcher({
        exportDir,
        dbPath,
        schemaCachePath: invalidCachePath,
      });

      // Indexing should still succeed even if cache generation fails
      const result = await watcher.indexLatest();
      watcher.close();

      expect(result.nodesIndexed).toBeGreaterThan(0);
      // Cache won't exist due to permission error, but indexing succeeded
    });
  });
});
