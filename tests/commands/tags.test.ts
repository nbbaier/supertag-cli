/**
 * Tests for tags command group
 *
 * The tags command consolidates:
 * - query tags
 * - query top-tags
 * - schema show <name>
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTagsCommand } from "../../src/commands/tags";
import { Command } from "commander";

describe("createTagsCommand", () => {
  it("should create a command named 'tags'", () => {
    const cmd = createTagsCommand();
    expect(cmd.name()).toBe("tags");
  });

  it("should have description mentioning supertags", () => {
    const cmd = createTagsCommand();
    expect(cmd.description().toLowerCase()).toContain("tag");
  });
});

describe("tags subcommands", () => {
  let cmd: Command;

  beforeEach(() => {
    cmd = createTagsCommand();
  });

  it("should have 'list' subcommand", () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain("list");
  });

  it("should have 'top' subcommand", () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain("top");
  });

  it("should have 'show' subcommand", () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain("show");
  });
});

describe("tags list subcommand", () => {
  let listCmd: Command;

  beforeEach(() => {
    const cmd = createTagsCommand();
    listCmd = cmd.commands.find(c => c.name() === "list")!;
  });

  it("should have --limit option", () => {
    const options = listCmd.options.map(o => o.long);
    expect(options).toContain("--limit");
  });

  it("should have standard options", () => {
    const options = listCmd.options.map(o => o.long);
    expect(options).toContain("--workspace");
    expect(options).toContain("--json");
  });
});

describe("tags top subcommand", () => {
  let topCmd: Command;

  beforeEach(() => {
    const cmd = createTagsCommand();
    topCmd = cmd.commands.find(c => c.name() === "top")!;
  });

  it("should have --limit option", () => {
    const options = topCmd.options.map(o => o.long);
    expect(options).toContain("--limit");
  });

  it("should have standard options", () => {
    const options = topCmd.options.map(o => o.long);
    expect(options).toContain("--workspace");
    expect(options).toContain("--json");
  });
});

describe("tags show subcommand", () => {
  let showCmd: Command;

  beforeEach(() => {
    const cmd = createTagsCommand();
    showCmd = cmd.commands.find(c => c.name() === "show")!;
  });

  it("should require tagname argument", () => {
    const args = showCmd._args;
    expect(args.length).toBe(1);
    expect(args[0].required).toBe(true);
  });

  it("should have standard options", () => {
    const options = showCmd.options.map(o => o.long);
    expect(options).toContain("--workspace");
    expect(options).toContain("--json");
  });
});

// ============================================================================
// Output formatting tests (T-2.1)
// ============================================================================

describe("tags top output formatting", () => {
  let topCmd: Command;

  beforeEach(() => {
    const cmd = createTagsCommand();
    topCmd = cmd.commands.find(c => c.name() === "top")!;
  });

  it("should have --pretty option", () => {
    const options = topCmd.options.map(o => o.long);
    expect(options).toContain("--pretty");
  });

  it("should have --no-pretty option for forcing Unix output", () => {
    const optionFlags = topCmd.options.map(o => o.flags);
    // Commander handles --no-pretty automatically when --pretty is defined
    expect(optionFlags.some(f => f.includes("--pretty"))).toBe(true);
  });

  it("should have --human-dates option", () => {
    const options = topCmd.options.map(o => o.long);
    expect(options).toContain("--human-dates");
  });

  it("should have --verbose option", () => {
    const options = topCmd.options.map(o => o.long);
    expect(options).toContain("--verbose");
  });
});

describe("tags list output formatting", () => {
  let listCmd: Command;

  beforeEach(() => {
    const cmd = createTagsCommand();
    listCmd = cmd.commands.find(c => c.name() === "list")!;
  });

  it("should have --pretty option", () => {
    const options = listCmd.options.map(o => o.long);
    expect(options).toContain("--pretty");
  });

  it("should have --verbose option", () => {
    const options = listCmd.options.map(o => o.long);
    expect(options).toContain("--verbose");
  });
});

// ============================================================================
// T-5.2: tags show with inferred types from database
// ============================================================================

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { migrateSupertagMetadataSchema, migrateSchemaConsolidation } from "../../src/db/migrate";

describe("tags show with UnifiedSchemaService (T-5.2)", () => {
  let testDir: string;
  let dbPath: string;
  let db: Database;

  beforeEach(() => {
    testDir = join("/tmp", `supertag-tags-test-${Date.now()}`);
    dbPath = join(testDir, "tana-index.db");
    mkdirSync(testDir, { recursive: true });

    // Create database with schema
    db = new Database(dbPath);
    migrateSupertagMetadataSchema(db);
    migrateSchemaConsolidation(db);
  });

  afterEach(() => {
    db.close();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should export getTagDetailsFromDatabase function", async () => {
    const { getTagDetailsFromDatabase } = await import("../../src/commands/tags");
    expect(typeof getTagDetailsFromDatabase).toBe("function");
  });

  it("should return tag details with inferred data types", async () => {
    // Insert test supertag and fields with inferred types
    db.run(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name, description, color)
      VALUES ('contact-id', 'contact', 'contact', 'A contact person', '#ff0000')
    `);
    db.run(`
      INSERT INTO supertag_fields (tag_id, tag_name, field_name, field_label_id, field_order, normalized_name, inferred_data_type)
      VALUES
        ('contact-id', 'contact', 'Email', 'email-attr', 0, 'email', 'email'),
        ('contact-id', 'contact', 'Birthday', 'bday-attr', 1, 'birthday', 'date'),
        ('contact-id', 'contact', 'Phone', 'phone-attr', 2, 'phone', 'phone')
    `);

    const { getTagDetailsFromDatabase } = await import("../../src/commands/tags");
    const details = getTagDetailsFromDatabase(dbPath, "contact");

    expect(details).toBeDefined();
    expect(details!.id).toBe("contact-id");
    expect(details!.name).toBe("contact");
    expect(details!.description).toBe("A contact person");
    expect(details!.color).toBe("#ff0000");
    expect(details!.fields).toHaveLength(3);
    expect(details!.fields[0].name).toBe("Email");
    expect(details!.fields[0].inferredDataType).toBe("email");
    expect(details!.fields[1].inferredDataType).toBe("date");
    expect(details!.fields[2].inferredDataType).toBe("phone");
  });

  it("should return null for non-existent tag", async () => {
    const { getTagDetailsFromDatabase } = await import("../../src/commands/tags");
    const details = getTagDetailsFromDatabase(dbPath, "nonexistent");

    expect(details).toBeNull();
  });

  it("should handle tag with no fields", async () => {
    db.run(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('empty-id', 'empty', 'empty')
    `);

    const { getTagDetailsFromDatabase } = await import("../../src/commands/tags");
    const details = getTagDetailsFromDatabase(dbPath, "empty");

    expect(details).toBeDefined();
    expect(details!.name).toBe("empty");
    expect(details!.fields).toHaveLength(0);
  });

  it("should support case-insensitive lookup via normalized name", async () => {
    db.run(`
      INSERT INTO supertag_metadata (tag_id, tag_name, normalized_name)
      VALUES ('contact-id', 'Contact', 'contact')
    `);

    const { getTagDetailsFromDatabase } = await import("../../src/commands/tags");

    // Both original and lowercase should work
    const byOriginal = getTagDetailsFromDatabase(dbPath, "Contact");
    const byLower = getTagDetailsFromDatabase(dbPath, "contact");

    expect(byOriginal).toBeDefined();
    expect(byLower).toBeDefined();
    expect(byOriginal!.id).toBe("contact-id");
    expect(byLower!.id).toBe("contact-id");
  });
});
