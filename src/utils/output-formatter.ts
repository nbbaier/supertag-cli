/**
 * Output Formatter - Strategy Pattern Implementation (Spec 054)
 *
 * Centralizes output formatting logic for CLI commands.
 * Three modes: unix (TSV), pretty (human-readable), json (structured)
 *
 * @example
 * const formatter = createFormatter({ mode: 'pretty' });
 * formatter.header('Search Results', 'search');
 * formatter.table(['ID', 'Name'], [['abc', 'Node 1']]);
 * formatter.tip('Use --show for details');
 * formatter.finalize();
 */

import { EMOJI } from "./format";

// ============================================================================
// Types and Interfaces (T-1.1)
// ============================================================================

/**
 * Output mode enum - matches existing CLI flag patterns
 */
export type OutputMode = "unix" | "pretty" | "json";

/**
 * Options for creating a formatter
 */
export interface FormatterOptions {
  /** Output mode: unix (TSV), pretty (human-readable), json (structured) */
  mode: OutputMode;
  /** Use human-readable date format instead of ISO */
  humanDates?: boolean;
  /** Include technical details (IDs, timing, etc.) */
  verbose?: boolean;
  /** Output stream (defaults to process.stdout) */
  stream?: NodeJS.WriteStream;
}

/**
 * Output formatting strategy interface
 *
 * All formatter implementations must implement these methods.
 * Methods that don't apply to a mode (e.g., header in unix mode)
 * should be implemented as no-ops.
 */
export interface OutputFormatter {
  /**
   * Format and output a single value
   * - Unix: outputs value as string with newline
   * - Pretty: outputs value as string with newline
   * - JSON: buffers value for array output
   */
  value(value: unknown): void;

  /**
   * Output a header/title with optional emoji
   * - Unix: no-op (skip headers)
   * - Pretty: outputs emoji + title
   * - JSON: no-op
   *
   * @param text - Header text
   * @param emoji - Optional emoji key from EMOJI constant
   */
  header(text: string, emoji?: keyof typeof EMOJI): void;

  /**
   * Output tabular data
   * - Unix: outputs TSV rows (no headers)
   * - Pretty: outputs formatted table with headers and separators
   * - JSON: buffers rows as objects using headers as keys
   *
   * @param headers - Column headers
   * @param rows - Table rows (array of arrays)
   */
  table(headers: string[], rows: (string | number | undefined)[][]): void;

  /**
   * Output a key-value record
   * - Unix: outputs YAML-like "key: value" lines
   * - Pretty: outputs aligned key-value pairs
   * - JSON: buffers record object
   *
   * @param fields - Key-value pairs
   */
  record(fields: Record<string, unknown>): void;

  /**
   * Output a list of items
   * - Unix: outputs one item per line
   * - Pretty: outputs bulleted list
   * - JSON: buffers items
   *
   * @param items - List items
   * @param bullet - Optional bullet character (default: '•')
   */
  list(items: string[], bullet?: string): void;

  /**
   * Output a separator/divider
   * - Unix: no-op
   * - Pretty: outputs horizontal line
   * - JSON: no-op
   */
  divider(): void;

  /**
   * Output a tip/hint message
   * - Unix: no-op
   * - Pretty: outputs tip with emoji
   * - JSON: no-op
   */
  tip(message: string): void;

  /**
   * Output an error message
   * - All modes: writes to stderr
   *
   * @param message - Error message
   */
  error(message: string): void;

  /**
   * Finalize output
   * - Unix: no-op
   * - Pretty: no-op
   * - JSON: outputs buffered data as JSON array/object
   *
   * Must be called at end of output to ensure all data is written.
   */
  finalize(): void;
}
