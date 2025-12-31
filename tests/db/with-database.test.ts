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
  withDatabase,
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

// =============================================================================
// T-1.2: withDatabase()
// =============================================================================

describe("withDatabase", () => {
  let testDir: string;
  let testDbPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `supertag-with-db-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    testDbPath = join(testDir, "test.db");

    // Create a test database
    const db = new Database(testDbPath);
    db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO test (name) VALUES ('initial')");
    db.close();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should execute callback and close database", async () => {
    let dbFromCallback: Database | null = null;

    const result = await withDatabase({ dbPath: testDbPath }, (ctx) => {
      dbFromCallback = ctx.db;
      expect(ctx.dbPath).toBe(testDbPath);

      // Verify we can query
      const row = ctx.db.query("SELECT name FROM test").get() as { name: string };
      return row.name;
    });

    expect(result).toBe("initial");
    // Database should be closed after withDatabase completes
    expect(() => dbFromCallback!.query("SELECT 1")).toThrow();
  });

  it("should close database even on error", async () => {
    let dbFromCallback: Database | null = null;

    await expect(
      withDatabase({ dbPath: testDbPath }, (ctx) => {
        dbFromCallback = ctx.db;
        throw new Error("Intentional test error");
      })
    ).rejects.toThrow("Intentional test error");

    // Database should be closed after error
    expect(() => dbFromCallback!.query("SELECT 1")).toThrow();
  });

  it("should throw DatabaseNotFoundError for missing file", async () => {
    const missingPath = join(testDir, "nonexistent.db");

    await expect(
      withDatabase({ dbPath: missingPath }, (ctx) => {
        return ctx.db;
      })
    ).rejects.toThrow(DatabaseNotFoundError);
  });

  it("should allow missing database when requireExists=false", async () => {
    const newDbPath = join(testDir, "new.db");
    expect(existsSync(newDbPath)).toBe(false);

    const result = await withDatabase({ dbPath: newDbPath, requireExists: false }, (ctx) => {
      ctx.db.exec("CREATE TABLE test (id INTEGER)");
      return "created";
    });

    expect(result).toBe("created");
    expect(existsSync(newDbPath)).toBe(true);
  });

  it("should support readonly mode", async () => {
    const result = await withDatabase({ dbPath: testDbPath, readonly: true }, (ctx) => {
      // Read should work
      const row = ctx.db.query("SELECT name FROM test").get() as { name: string };
      return row.name;
    });

    expect(result).toBe("initial");
  });

  it("should reject writes in readonly mode", async () => {
    await expect(
      withDatabase({ dbPath: testDbPath, readonly: true }, (ctx) => {
        ctx.db.exec("INSERT INTO test (name) VALUES ('new')");
      })
    ).rejects.toThrow();
  });

  it("should support async callbacks", async () => {
    const result = await withDatabase({ dbPath: testDbPath }, async (ctx) => {
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 10));
      const row = ctx.db.query("SELECT name FROM test").get() as { name: string };
      return row.name;
    });

    expect(result).toBe("initial");
  });
});
