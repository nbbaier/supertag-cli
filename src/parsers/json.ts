/**
 * JSON Parser
 * Parses and validates JSON input
 */

import { ParseError } from '../utils/errors';
import type { GenericJson } from '../types';

/**
 * Parse JSON string safely
 * @param input JSON string
 * @returns Parsed JSON object or array
 * @throws ParseError if invalid JSON
 */
export function parseJson(input: string): GenericJson | GenericJson[] {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new ParseError('Empty input - no JSON to parse');
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed;
  } catch (error) {
    throw new ParseError(
      `Invalid JSON: ${error instanceof Error ? error.message : String(error)}\n\n` +
      'Expected valid JSON object or array.'
    );
  }
}

/**
 * Parse JSON Lines format (newline-delimited JSON)
 * @param input JSON Lines string
 * @returns Array of parsed JSON objects
 * @throws ParseError if invalid
 */
export function parseJsonLines(input: string): GenericJson[] {
  const lines = input.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new ParseError('Empty input - no JSON Lines to parse');
  }

  const results: GenericJson[] = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const parsed = JSON.parse(lines[i]);
      results.push(parsed);
    } catch (error) {
      throw new ParseError(
        `Invalid JSON on line ${i + 1}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return results;
}

/**
 * Smart JSON parser - handles both regular JSON and JSON Lines
 * @param input JSON string (single object/array or newline-delimited)
 * @returns Parsed JSON object or array
 */
export function parseJsonSmart(input: string): GenericJson | GenericJson[] {
  const trimmed = input.trim();

  // Try regular JSON first
  try {
    return parseJson(trimmed);
  } catch {
    // If that fails, try JSON Lines
    try {
      return parseJsonLines(trimmed);
    } catch {
      throw new ParseError(
        'Invalid input format. Expected:\n' +
        '  - Valid JSON object: {"name": "value"}\n' +
        '  - Valid JSON array: [{"name": "value"}]\n' +
        '  - JSON Lines: one JSON object per line'
      );
    }
  }
}

/**
 * Validate JSON structure for Tana conversion
 * @param json Parsed JSON
 * @returns Validation result with warnings
 */
export function validateJsonStructure(json: GenericJson | GenericJson[]): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (Array.isArray(json)) {
    if (json.length === 0) {
      warnings.push('Empty array - no nodes to convert');
    }

    // Check if array items are objects
    for (let i = 0; i < json.length; i++) {
      if (typeof json[i] !== 'object' || json[i] === null) {
        warnings.push(`Item ${i + 1} is not an object - may not convert well`);
      }
    }
  } else {
    if (typeof json !== 'object' || json === null) {
      warnings.push('Input is not an object - may not convert well');
    }
  }

  return {
    valid: true,
    warnings,
  };
}
