/**
 * TDD Test Suite for Tana Show CLI
 *
 * Tests for displaying full contents of Tana nodes including:
 * - Field extraction from tuple structures
 * - Tag resolution
 * - Content children identification
 * - Date and reference formatting
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync } from "fs";

// Import the functions we're testing (will need to export them)
// For now, we'll test via the CLI output

const TEST_DB_PATH = "./test-production.db";

describe("Tana Show - Node Contents Extraction (RED)", () => {
  beforeAll(() => {
    if (!existsSync(TEST_DB_PATH)) {
      throw new Error(`Test database not found: ${TEST_DB_PATH}`);
    }
  });

  test("should find node by ID", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "node", "aL_DgoY0OG21", "--db-path", TEST_DB_PATH, "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    expect(result.id).toBe("aL_DgoY0OG21");
    expect(result.name).toBe("SOC at BZ Pflege");
    expect(result.tags).toContain("project");
  });

  test("should extract fields from tuple children", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "node", "aL_DgoY0OG21", "--db-path", TEST_DB_PATH, "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    expect(result.fields).toBeDefined();
    expect(Array.isArray(result.fields)).toBe(true);

    // Should have Status and Vault fields
    const fieldNames = result.fields.map((f: any) => f.fieldName);
    expect(fieldNames).toContain("⚙️ Status");
    expect(fieldNames).toContain("⚙️ Vault");
  });

  test("should resolve field values to names not IDs", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "node", "aL_DgoY0OG21", "--db-path", TEST_DB_PATH, "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    const statusField = result.fields.find((f: any) => f.fieldName === "⚙️ Status");
    expect(statusField).toBeDefined();
    expect(statusField.value).toBe("Active");

    const vaultField = result.fields.find((f: any) => f.fieldName === "⚙️ Vault");
    expect(vaultField).toBeDefined();
    expect(vaultField.value).toBe("Focus Stream Storage");
  });

  test("should identify content children vs field tuples", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "node", "aL_DgoY0OG21", "--db-path", TEST_DB_PATH, "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    expect(result.children).toBeDefined();
    expect(Array.isArray(result.children)).toBe(true);

    // Should have Smart Pad as a content child
    const childNames = result.children.map((c: any) => c.name);
    expect(childNames).toContain("Smart Pad");
  });

  test("should include node tags", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "node", "aL_DgoY0OG21", "--db-path", TEST_DB_PATH, "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.tags).toContain("project");
  });
});

describe("Tana Show - Tagged Query (RED)", () => {
  test("should find latest node with specific tag", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "tagged", "project", "--db-path", TEST_DB_PATH, "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].tags).toContain("project");
  });

  test("should return multiple nodes with --limit", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "tagged", "project", "--db-path", TEST_DB_PATH, "--limit", "3", "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  test("should handle case-insensitive tag matching", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "tagged", "Project", "--db-path", TEST_DB_PATH, "-i", "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("Tana Show - Date Formatting (RED)", () => {
  test("should format inline date references", async () => {
    // Find a node with a due date - Deliverable has one
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "tagged", "Deliverable", "--db-path", TEST_DB_PATH, "--json"],
      { stdout: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output);

    expect(result.length).toBeGreaterThan(0);

    const dueDateField = result[0].fields.find((f: any) =>
      f.fieldName === "Due date" || f.fieldName.includes("Due")
    );

    if (dueDateField) {
      // Should be formatted as a date string, not raw HTML
      expect(dueDateField.value).not.toContain("<span");
      expect(dueDateField.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("Tana Show - Error Handling (RED)", () => {
  test("should error on non-existent node ID", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "node", "nonexistent123", "--db-path", TEST_DB_PATH],
      { stdout: "pipe", stderr: "pipe" }
    );
    await proc.exited;
    expect(proc.exitCode).toBe(1);
  });

  test("should error on non-existent tag", async () => {
    const proc = Bun.spawn(
      ["bun", "./src/cli/tana-show.ts", "tagged", "nonexistenttag999", "--db-path", TEST_DB_PATH],
      { stdout: "pipe", stderr: "pipe" }
    );
    await proc.exited;
    expect(proc.exitCode).toBe(1);
  });
});
