/**
 * Tests for Database Resource Management
 *
 * Higher-order functions that wrap database operations with automatic resource cleanup.
 * Spec: 053-database-resource-management
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Database } from "bun:sqlite";

// Import the module under test
import {
  DatabaseNotFoundError,
  type DatabaseContext,
  type QueryContext,
  type DatabaseOptions,
} from "../../src/db/with-database";

// =============================================================================
// T-1.1: Types and Error Classes
// =============================================================================

describe("DatabaseNotFoundError", () => {
  it("should be an instance of Error", () => {
    const error = new DatabaseNotFoundError("/path/to/missing.db");
    expect(error).toBeInstanceOf(Error);
  });

  it("should have name 'DatabaseNotFoundError'", () => {
    const error = new DatabaseNotFoundError("/path/to/missing.db");
    expect(error.name).toBe("DatabaseNotFoundError");
  });

  it("should store dbPath property", () => {
    const dbPath = "/path/to/missing.db";
    const error = new DatabaseNotFoundError(dbPath);
    expect(error.dbPath).toBe(dbPath);
  });

  it("should have descriptive message", () => {
    const dbPath = "/path/to/missing.db";
    const error = new DatabaseNotFoundError(dbPath);
    expect(error.message).toContain("Database not found");
    expect(error.message).toContain(dbPath);
  });
});

describe("DatabaseContext type", () => {
  it("should be usable as a type", () => {
    // Type check - if this compiles, the type exists
    const ctx: DatabaseContext = {
      db: new Database(":memory:"),
      dbPath: ":memory:",
    };
    expect(ctx.db).toBeDefined();
    expect(ctx.dbPath).toBe(":memory:");
    ctx.db.close();
  });
});

describe("QueryContext type", () => {
  it("should extend DatabaseContext", () => {
    // QueryContext should have db, dbPath, and engine
    // This is a compile-time check
    const mockEngine = {} as any;
    const ctx: QueryContext = {
      db: new Database(":memory:"),
      dbPath: ":memory:",
      engine: mockEngine,
    };
    expect(ctx.db).toBeDefined();
    expect(ctx.dbPath).toBe(":memory:");
    expect(ctx.engine).toBe(mockEngine);
    ctx.db.close();
  });
});

describe("DatabaseOptions type", () => {
  it("should accept dbPath only", () => {
    const opts: DatabaseOptions = { dbPath: "/path/to/db" };
    expect(opts.dbPath).toBe("/path/to/db");
  });

  it("should accept optional readonly", () => {
    const opts: DatabaseOptions = { dbPath: "/path/to/db", readonly: true };
    expect(opts.readonly).toBe(true);
  });

  it("should accept optional requireExists", () => {
    const opts: DatabaseOptions = { dbPath: "/path/to/db", requireExists: false };
    expect(opts.requireExists).toBe(false);
  });
});
