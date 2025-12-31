/**
 * Database Resource Management
 *
 * Higher-order functions that wrap database operations with automatic resource cleanup.
 * Provides Rust-style RAII pattern for database connections.
 *
 * Spec: 053-database-resource-management
 */

import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import type { TanaQueryEngine } from "../query/tana-query-engine";
import type { ResolvedWorkspace } from "../config/workspace-resolver";

// =============================================================================
// Types
// =============================================================================

/**
 * Context passed to database callbacks
 */
export interface DatabaseContext {
  /** Open SQLite database connection */
  db: Database;
  /** Path to the database file */
  dbPath: string;
}

/**
 * Context passed to query engine callbacks (extends DatabaseContext)
 */
export interface QueryContext extends DatabaseContext {
  /** Query engine instance */
  engine: TanaQueryEngine;
}

/**
 * Options for database operations
 */
export interface DatabaseOptions {
  /** Path to the SQLite database file */
  dbPath: string;
  /** Open database in readonly mode (default: false) */
  readonly?: boolean;
  /** Require database file to exist (default: true) */
  requireExists?: boolean;
}

/**
 * Options for workspace database operations
 */
export interface WorkspaceDatabaseOptions {
  /** Workspace alias, nodeid, or rootFileId */
  workspace?: string;
  /** Open database in readonly mode (default: false) */
  readonly?: boolean;
}

/**
 * Context for workspace database callbacks
 */
export interface WorkspaceDatabaseContext extends DatabaseContext {
  /** Resolved workspace information */
  workspace: ResolvedWorkspace;
}

/**
 * Context for workspace query callbacks
 */
export interface WorkspaceQueryContext extends QueryContext {
  /** Resolved workspace information */
  workspace: ResolvedWorkspace;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Thrown when database file does not exist and requireExists is true
 */
export class DatabaseNotFoundError extends Error {
  public readonly name = "DatabaseNotFoundError";

  constructor(public readonly dbPath: string) {
    super(`Database not found: ${dbPath}`);
  }
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Execute a function with an auto-closing database connection.
 *
 * Opens a SQLite database, executes the callback, and guarantees the database
 * is closed afterwards (even if an error occurs).
 *
 * @example
 * ```typescript
 * const result = await withDatabase({ dbPath: '/path/to/db' }, (ctx) => {
 *   return ctx.db.query('SELECT * FROM nodes').all();
 * });
 * ```
 *
 * @param options - Database options (path, readonly, requireExists)
 * @param fn - Callback function receiving DatabaseContext
 * @returns Promise resolving to callback's return value
 * @throws DatabaseNotFoundError if database doesn't exist and requireExists is true
 */
export async function withDatabase<T>(
  options: DatabaseOptions,
  fn: (ctx: DatabaseContext) => T | Promise<T>
): Promise<T> {
  const { dbPath, readonly = false, requireExists = true } = options;

  // Check if database exists (unless creating new)
  if (requireExists && !existsSync(dbPath)) {
    throw new DatabaseNotFoundError(dbPath);
  }

  // Open database (only pass readonly option if true)
  const db = readonly ? new Database(dbPath, { readonly: true }) : new Database(dbPath);

  try {
    // Execute callback (may be sync or async)
    const result = await fn({ db, dbPath });
    return result;
  } finally {
    // Always close database
    db.close();
  }
}
