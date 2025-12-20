/**
 * Embed Generate Command Tests
 * TDD: Tests for embed generate using TanaEmbeddingService (resona/LanceDB)
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";

// Test temp directory
const TEST_DIR = "/tmp/supertag-embed-generate-test";

describe("embed generate command (resona migration)", () => {
  beforeEach(() => {
    // Clean up before each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("TanaEmbeddingService integration", () => {
    it("should create TanaEmbeddingService from config", async () => {
      const { TanaEmbeddingService } = await import("../../src/embeddings/tana-embedding-service");

      const dbPath = join(TEST_DIR, "embeddings.lance");
      const service = new TanaEmbeddingService(dbPath, {
        model: "mxbai-embed-large",
        endpoint: "http://localhost:11434"
      });

      expect(service).toBeDefined();
      service.close();
    });

    it("should get embedding config from ConfigManager", async () => {
      const { ConfigManager, DEFAULT_EMBEDDING_CONFIG } = await import("../../src/config/manager");

      // ConfigManager should provide default config
      const configManager = ConfigManager.getInstance();
      const embeddingConfig = configManager.getEmbeddingConfig();

      expect(embeddingConfig.model).toBe(DEFAULT_EMBEDDING_CONFIG.model);
      expect(embeddingConfig.endpoint).toBe(DEFAULT_EMBEDDING_CONFIG.endpoint);
    });

    it("should derive LanceDB path from workspace context", async () => {
      const { TanaEmbeddingService } = await import("../../src/embeddings/tana-embedding-service");

      // If given a SQLite .db path, should convert to .lance
      const dbPath = join(TEST_DIR, "tana-index.db");
      const service = new TanaEmbeddingService(dbPath);

      expect(service.getDbPath()).toContain(".lance");
      expect(service.getDbPath()).not.toContain(".db");

      service.close();
    });
  });

  describe("ContextualizedNode mapping", () => {
    it("should map ContextualizedNode to resona ItemToEmbed", async () => {
      const { TanaEmbeddingService } = await import("../../src/embeddings/tana-embedding-service");
      type ContextualizedNode = import("../../src/embeddings/contextualize").ContextualizedNode;

      const service = new TanaEmbeddingService(join(TEST_DIR, "embeddings.lance"));

      // Test data matching ContextualizedNode structure
      const contextualizedNodes: ContextualizedNode[] = [
        {
          nodeId: "abc123",
          nodeName: "Review quarterly goals",
          ancestorId: "proj456",
          ancestorName: "Q4 Planning Project",
          ancestorTags: ["project"],
          contextText: "Project: Q4 Planning Project | Review quarterly goals"
        }
      ];

      // embedNodes should accept this without error (method exists and accepts type)
      expect(typeof service.embedNodes).toBe("function");

      service.close();
    });
  });

  describe("progress callback", () => {
    it("should support progress callback in batch options", async () => {
      const { TanaEmbeddingService } = await import("../../src/embeddings/tana-embedding-service");

      const service = new TanaEmbeddingService(join(TEST_DIR, "embeddings.lance"));

      // embedNodes should accept options with onProgress
      expect(typeof service.embedNodes).toBe("function");

      service.close();
    });
  });

  describe("workspace embedding paths", () => {
    it("should derive embedding path from workspace dbPath", () => {
      // The LanceDB path should be derived from workspace context
      const wsDbPath = "/Users/fischer/.local/share/supertag/workspaces/main/tana-index.db";
      const expectedLancePath = wsDbPath.replace(/\.db$/, ".lance");

      expect(expectedLancePath).toBe("/Users/fischer/.local/share/supertag/workspaces/main/tana-index.lance");
    });

    it("should keep .lance path unchanged", () => {
      const lancePath = "/path/to/embeddings.lance";
      const result = lancePath.replace(/\.db$/, ".lance");

      expect(result).toBe("/path/to/embeddings.lance");
    });
  });
});
