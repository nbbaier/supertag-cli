/**
 * Embed Config (New - Resona Migration)
 *
 * New implementation using ConfigManager instead of database.
 * Uses resona for model dimensions auto-detection.
 */

import { OLLAMA_MODEL_DIMENSIONS } from "resona";
import type { EmbeddingConfig } from "../types";

/**
 * Get model dimensions from resona's known models
 * @param model - Model name (e.g., "bge-m3")
 * @returns Dimensions or undefined if unknown
 */
export function getModelDimensionsFromResona(model: string): number | undefined {
  return OLLAMA_MODEL_DIMENSIONS[model];
}

/**
 * Validate if a model is known to resona
 * @param model - Model name to validate
 * @returns true if model is known, false otherwise
 */
export function validateEmbeddingModel(model: string): boolean {
  return model in OLLAMA_MODEL_DIMENSIONS;
}

/**
 * Format embedding configuration for CLI display
 * @param config - Embedding config or undefined if not configured
 * @returns Formatted string for display
 */
export function formatEmbeddingConfigDisplay(config: EmbeddingConfig | undefined): string {
  const lines: string[] = [];

  lines.push("🔍 Embedding Configuration");
  lines.push("");

  if (!config) {
    lines.push("Status: not configured");
    lines.push("");
    lines.push("To configure embeddings, use:");
    lines.push("  supertag embed config --model bge-m3");
    lines.push("");
    lines.push("Available models (via Ollama):");
    lines.push("");
    lines.push("  - bge-m3 (1024d) - Recommended: 8k context, excellent short text");
    lines.push("  - mxbai-embed-large (1024d) - 512 token limit");
    lines.push("  - nomic-embed-text (768d) - 8k context, weak on short text");
    lines.push("  - all-minilm (384d) - Lightweight");
    return lines.join("\n");
  }

  const dimensions = getModelDimensionsFromResona(config.model);
  const dimensionsDisplay = dimensions ? `${dimensions}` : "unknown";

  lines.push(`Model:       ${config.model}`);
  lines.push(`Dimensions:  ${dimensionsDisplay}`);
  lines.push(`Endpoint:    ${config.endpoint || "http://localhost:11434"}`);
  lines.push("");
  lines.push("Provider:    Ollama (via resona/LanceDB)");

  return lines.join("\n");
}

/**
 * Get list of available models with descriptions
 */
export function getAvailableModels(): Array<{ name: string; dimensions: number; description: string }> {
  return [
    { name: "bge-m3", dimensions: 1024, description: "Recommended - 8k context, excellent short text" },
    { name: "mxbai-embed-large", dimensions: 1024, description: "512 token limit - too small for long text" },
    { name: "nomic-embed-text", dimensions: 768, description: "8k context - weak on short text/names" },
    { name: "all-minilm", dimensions: 384, description: "Lightweight - Fast" },
  ];
}
