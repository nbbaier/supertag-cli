/**
 * Embed Config Command Tests
 * TDD: Tests for embed config using ConfigManager (not database)
 */

import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

// Test temp directory for config files
const TEST_CONFIG_DIR = "/tmp/supertag-embed-config-test";
const TEST_CONFIG_FILE = join(TEST_CONFIG_DIR, "config.json");

describe("embed config command", () => {
  beforeEach(() => {
    // Clean up before each test
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
    mkdirSync(TEST_CONFIG_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  describe("ConfigManager embedding integration", () => {
    it("should get default embedding config when none set", async () => {
      // Import ConfigManager and defaults
      const { DEFAULT_EMBEDDING_CONFIG } = await import("../../src/config/manager");

      expect(DEFAULT_EMBEDDING_CONFIG.model).toBe("bge-m3");
      expect(DEFAULT_EMBEDDING_CONFIG.endpoint).toBe("http://localhost:11434");
    });

    it("should support setting model via config", async () => {
      // Test that EmbeddingConfig type supports model
      const config: import("../../src/types").EmbeddingConfig = {
        model: "nomic-embed-text"
      };

      expect(config.model).toBe("nomic-embed-text");
    });

    it("should support setting custom endpoint via config", async () => {
      const config: import("../../src/types").EmbeddingConfig = {
        model: "mxbai-embed-large",
        endpoint: "http://custom:11434"
      };

      expect(config.endpoint).toBe("http://custom:11434");
    });
  });

  describe("model dimension detection", () => {
    it("should have known dimensions for mxbai-embed-large", async () => {
      // Import from resona
      const { OLLAMA_MODEL_DIMENSIONS } = await import("resona");

      expect(OLLAMA_MODEL_DIMENSIONS["mxbai-embed-large"]).toBe(1024);
    });

    it("should have known dimensions for nomic-embed-text", async () => {
      const { OLLAMA_MODEL_DIMENSIONS } = await import("resona");

      expect(OLLAMA_MODEL_DIMENSIONS["nomic-embed-text"]).toBe(768);
    });

    it("should have known dimensions for all-minilm", async () => {
      const { OLLAMA_MODEL_DIMENSIONS } = await import("resona");

      expect(OLLAMA_MODEL_DIMENSIONS["all-minilm"]).toBe(384);
    });
  });

  describe("config file integration", () => {
    it("should store embeddings config in TanaConfig", async () => {
      // TanaConfig should have embeddings field
      const config: import("../../src/types").TanaConfig = {
        apiEndpoint: "https://example.com",
        defaultTargetNode: "INBOX",
        embeddings: {
          model: "mxbai-embed-large",
          endpoint: "http://localhost:11434"
        }
      };

      expect(config.embeddings?.model).toBe("mxbai-embed-large");
    });

    it("embeddings field should be optional in TanaConfig", async () => {
      const config: import("../../src/types").TanaConfig = {
        apiEndpoint: "https://example.com",
        defaultTargetNode: "INBOX"
      };

      expect(config.embeddings).toBeUndefined();
    });
  });

  describe("provider support", () => {
    it("should create OllamaProvider from resona", async () => {
      const { OllamaProvider } = await import("resona");

      // Should not throw with known model
      const provider = new OllamaProvider("mxbai-embed-large");

      expect(provider.name).toBe("ollama");
      expect(provider.model).toBe("mxbai-embed-large");
      expect(provider.dimensions).toBe(1024);
    });

    it("should accept custom endpoint for OllamaProvider", async () => {
      const { OllamaProvider } = await import("resona");

      const provider = new OllamaProvider(
        "mxbai-embed-large",
        "http://custom:11434"
      );

      expect(provider.model).toBe("mxbai-embed-large");
    });
  });

  describe("new embed config functions (resona migration)", () => {
    it("should format embedding config for display", async () => {
      const { formatEmbeddingConfigDisplay } = await import("../../src/embeddings/embed-config-new");
      const config = {
        model: "mxbai-embed-large",
        endpoint: "http://localhost:11434"
      };

      const output = formatEmbeddingConfigDisplay(config);

      expect(output).toContain("mxbai-embed-large");
      expect(output).toContain("1024"); // dimensions from resona
      expect(output).toContain("http://localhost:11434");
    });

    it("should show unconfigured state when no embeddings", async () => {
      const { formatEmbeddingConfigDisplay } = await import("../../src/embeddings/embed-config-new");

      const output = formatEmbeddingConfigDisplay(undefined);

      expect(output).toContain("not configured");
      expect(output).toContain("supertag embed config");
    });

    it("should validate known models", async () => {
      const { validateEmbeddingModel } = await import("../../src/embeddings/embed-config-new");

      // Known models should pass
      expect(validateEmbeddingModel("mxbai-embed-large")).toBe(true);
      expect(validateEmbeddingModel("nomic-embed-text")).toBe(true);
      expect(validateEmbeddingModel("all-minilm")).toBe(true);
    });

    it("should warn but allow unknown models", async () => {
      const { validateEmbeddingModel } = await import("../../src/embeddings/embed-config-new");

      // Unknown model should return false but not throw
      expect(validateEmbeddingModel("unknown-model")).toBe(false);
    });

    it("should get model dimensions from resona", async () => {
      const { getModelDimensionsFromResona } = await import("../../src/embeddings/embed-config-new");

      expect(getModelDimensionsFromResona("mxbai-embed-large")).toBe(1024);
      expect(getModelDimensionsFromResona("nomic-embed-text")).toBe(768);
      expect(getModelDimensionsFromResona("all-minilm")).toBe(384);
      expect(getModelDimensionsFromResona("unknown")).toBeUndefined();
    });
  });
});
