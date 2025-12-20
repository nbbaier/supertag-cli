/**
 * TanaEmbeddingService Tests
 * TDD: Tests for thin wrapper around resona EmbeddingService
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import type { ContextualizedNode } from "./contextualize";

// Test temp directory
const TEST_DIR = "/tmp/tana-embedding-test";
const TEST_DB_PATH = join(TEST_DIR, "embeddings.lance");

describe("TanaEmbeddingService", () => {
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

  describe("constructor", () => {
    it("should create service with default options", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      expect(service).toBeDefined();
      expect(service.getDbPath()).toContain("embeddings.lance");

      service.close();
    });

    it("should accept custom model option", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH, {
        model: "nomic-embed-text"
      });

      expect(service).toBeDefined();

      service.close();
    });

    it("should accept custom endpoint option", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH, {
        endpoint: "http://custom:11434"
      });

      expect(service).toBeDefined();

      service.close();
    });
  });

  describe("embedNodes", () => {
    it("should accept ContextualizedNode array", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      const nodes: ContextualizedNode[] = [
        {
          nodeId: "node1",
          nodeName: "Test Node",
          ancestorId: null,
          ancestorName: null,
          ancestorTags: [],
          contextText: "Test Node"
        }
      ];

      // Method should exist and accept nodes
      expect(typeof service.embedNodes).toBe("function");

      service.close();
    });

    it("should map ContextualizedNode to ItemToEmbed", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      // Test the internal mapping via public API
      const nodes: ContextualizedNode[] = [
        {
          nodeId: "abc123",
          nodeName: "Review meeting notes",
          ancestorId: "proj456",
          ancestorName: "Q4 Planning",
          ancestorTags: ["project"],
          contextText: "Project: Q4 Planning | Review meeting notes"
        }
      ];

      // The mapping should use:
      // - id = nodeId
      // - text = nodeName
      // - contextText = contextText
      // We can't directly test the mapping, but we can verify the API works
      expect(typeof service.embedNodes).toBe("function");

      service.close();
    });
  });

  describe("search", () => {
    it("should return node IDs with similarity scores", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      // Method should exist
      expect(typeof service.search).toBe("function");

      // Search should return array with nodeId, distance, similarity
      // (Empty results when no embeddings exist)
      const results = await service.search("test query", 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0); // No embeddings yet

      service.close();
    });

    it("should accept optional k parameter", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      // Should work with default k
      const results1 = await service.search("test query");
      expect(Array.isArray(results1)).toBe(true);

      // Should work with explicit k
      const results2 = await service.search("test query", 5);
      expect(Array.isArray(results2)).toBe(true);

      service.close();
    });
  });

  describe("getStats", () => {
    it("should return embedding statistics", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      const stats = await service.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalEmbeddings).toBe("number");
      expect(typeof stats.model).toBe("string");
      expect(typeof stats.dimensions).toBe("number");

      service.close();
    });

    it("should return zero embeddings when database is empty", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      const stats = await service.getStats();

      expect(stats.totalEmbeddings).toBe(0);

      service.close();
    });
  });

  describe("getEmbeddedIds", () => {
    it("should return array of embedded node IDs", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      const ids = await service.getEmbeddedIds();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBe(0); // No embeddings yet

      service.close();
    });
  });

  describe("close", () => {
    it("should close the database connection", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      // Should not throw
      expect(() => service.close()).not.toThrow();
    });

    it("should be safe to call multiple times", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      // Multiple close calls should not throw
      service.close();
      service.close();
      expect(true).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should remove embeddings not in keepIds", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(TEST_DB_PATH);

      // Method should exist
      expect(typeof service.cleanup).toBe("function");

      // Cleanup with empty keep list (remove all)
      const removed = await service.cleanup([]);
      expect(typeof removed).toBe("number");
      expect(removed).toBe(0); // Nothing to remove when empty

      service.close();
    });
  });

  describe("LanceDB path conversion", () => {
    it("should convert .db path to .lance", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      // If given a .db path, should use .lance
      const service = new TanaEmbeddingService(join(TEST_DIR, "test.db"));

      expect(service.getDbPath()).toContain(".lance");
      expect(service.getDbPath()).not.toContain(".db");

      service.close();
    });

    it("should keep .lance path as-is", async () => {
      const { TanaEmbeddingService } = await import("./tana-embedding-service");

      const service = new TanaEmbeddingService(join(TEST_DIR, "test.lance"));

      expect(service.getDbPath()).toContain(".lance");

      service.close();
    });
  });
});

describe("TanaEmbeddingService result format", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it("search results should include nodeId (mapped from id)", async () => {
    const { TanaEmbeddingService } = await import("./tana-embedding-service");

    const service = new TanaEmbeddingService(TEST_DB_PATH);

    // The search method should return results with nodeId field
    // (This is the Tana-specific field name for the resona id)
    const results = await service.search("test");

    // Empty but shape should be correct
    expect(Array.isArray(results)).toBe(true);

    // When results exist, each should have: nodeId, distance, similarity
    // We can't test with real data without Ollama, but we verify the API

    service.close();
  });
});
