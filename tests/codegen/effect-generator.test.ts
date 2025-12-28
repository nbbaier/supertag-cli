/**
 * T-2.1 & T-2.2: Tests for Effect Schema generator
 * TDD: RED phase - write tests before implementation
 */

import { describe, it, expect } from "bun:test";
import {
  generateEffectClass,
  generateEffectFile,
} from "../../src/codegen/effect-generator";
import type { CodegenSupertag, CodegenOptions } from "../../src/codegen/types";

const defaultOptions: CodegenOptions = {
  outputPath: "./generated/schemas.ts",
  format: "effect",
  optionalStrategy: "option",
  naming: "camelCase",
  includeMetadata: true,
  split: false,
  includeInherited: true,
};

describe("generateEffectClass", () => {
  it("should generate a basic class with no fields", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "EmptyTag",
      className: "EmptyTag",
      fields: [],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    expect(result).toContain('export class EmptyTag extends Schema.Class<EmptyTag>("EmptyTag")');
    expect(result).toContain("{}");
  });

  it("should generate a class with string field", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "TodoItem",
      className: "TodoItem",
      fields: [
        {
          originalName: "Title",
          propertyName: "title",
          effectSchema: "Schema.String",
          isOptional: false,
        },
      ],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    expect(result).toContain("title: Schema.String");
  });

  it("should generate a class with optional field", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "TodoItem",
      className: "TodoItem",
      fields: [
        {
          originalName: "Notes",
          propertyName: "notes",
          effectSchema: 'Schema.optionalWith(Schema.String, { as: "Option" })',
          isOptional: true,
        },
      ],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    expect(result).toContain('notes: Schema.optionalWith(Schema.String, { as: "Option" })');
  });

  it("should include JSDoc comments for fields with comments", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "TodoItem",
      className: "TodoItem",
      fields: [
        {
          originalName: "Priority",
          propertyName: "priority",
          effectSchema: "Schema.String",
          comment: "Task priority level",
          isOptional: true,
        },
      ],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    expect(result).toContain("/** Task priority level */");
  });

  it("should include metadata comments when enabled", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "TodoItem",
      className: "TodoItem",
      fields: [],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, { ...defaultOptions, includeMetadata: true });

    expect(result).toContain("Generated from Tana supertag: TodoItem");
    expect(result).toContain("Supertag ID: abc123");
    expect(result).toContain("2025-12-28T10:00:00Z");
  });

  it("should not include metadata comments when disabled", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "TodoItem",
      className: "TodoItem",
      fields: [],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, { ...defaultOptions, includeMetadata: false });

    expect(result).not.toContain("Generated from Tana supertag");
    expect(result).not.toContain("Supertag ID");
  });

  it("should always include id field as first field", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "TodoItem",
      className: "TodoItem",
      fields: [
        {
          originalName: "Title",
          propertyName: "title",
          effectSchema: "Schema.String",
          isOptional: false,
        },
      ],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    // id should appear before title
    const idIndex = result.indexOf("id: Schema.String");
    const titleIndex = result.indexOf("title: Schema.String");
    expect(idIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeGreaterThan(-1);
    expect(idIndex).toBeLessThan(titleIndex);
  });

  it("should generate multiple fields correctly", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "TodoItem",
      className: "TodoItem",
      fields: [
        {
          originalName: "Title",
          propertyName: "title",
          effectSchema: "Schema.String",
          isOptional: false,
        },
        {
          originalName: "Due Date",
          propertyName: "dueDate",
          effectSchema: "Schema.DateFromString",
          comment: "When the task is due",
          isOptional: true,
        },
        {
          originalName: "Completed",
          propertyName: "completed",
          effectSchema: "Schema.Boolean",
          isOptional: true,
        },
      ],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    expect(result).toContain("title: Schema.String");
    expect(result).toContain("dueDate: Schema.DateFromString");
    expect(result).toContain("completed: Schema.Boolean");
    expect(result).toContain("/** When the task is due */");
  });
});

describe("generateEffectClass with inheritance", () => {
  it("should use extend() for child classes with parent", () => {
    const tag: CodegenSupertag = {
      id: "child123",
      name: "WorkTask",
      className: "WorkTask",
      parentClassName: "TodoItem",
      fields: [
        {
          originalName: "Project",
          propertyName: "project",
          effectSchema: "Schema.String",
          isOptional: true,
        },
      ],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "child123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    expect(result).toContain("extends TodoItem.extend");
    expect(result).toContain('"WorkTask"');
  });

  it("should still include id field for root classes", () => {
    const tag: CodegenSupertag = {
      id: "abc123",
      name: "TodoItem",
      className: "TodoItem",
      fields: [],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "abc123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    expect(result).toContain("id: Schema.String");
  });

  it("should NOT include id field for child classes (inherited from parent)", () => {
    const tag: CodegenSupertag = {
      id: "child123",
      name: "WorkTask",
      className: "WorkTask",
      parentClassName: "TodoItem",
      fields: [
        {
          originalName: "Project",
          propertyName: "project",
          effectSchema: "Schema.String",
          isOptional: true,
        },
      ],
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "child123",
      },
    };

    const result = generateEffectClass(tag, defaultOptions);

    // Child should not have its own id field (inherits from parent)
    const idMatches = result.match(/id:/g);
    expect(idMatches).toBeNull();
  });
});

describe("generateEffectFile", () => {
  it("should include Effect import", () => {
    const tags: CodegenSupertag[] = [];

    const result = generateEffectFile(tags, defaultOptions);

    expect(result).toContain('import { Schema } from "effect"');
  });

  it("should include header comment", () => {
    const tags: CodegenSupertag[] = [];

    const result = generateEffectFile(tags, defaultOptions);

    expect(result).toContain("Generated by supertag-cli codegen");
    expect(result).toContain("DO NOT EDIT");
  });

  it("should include all classes", () => {
    const tags: CodegenSupertag[] = [
      {
        id: "abc123",
        name: "TodoItem",
        className: "TodoItem",
        fields: [],
        metadata: { syncedAt: "2025-12-28T10:00:00Z", tagId: "abc123" },
      },
      {
        id: "def456",
        name: "Person",
        className: "Person",
        fields: [],
        metadata: { syncedAt: "2025-12-28T10:00:00Z", tagId: "def456" },
      },
    ];

    const result = generateEffectFile(tags, defaultOptions);

    expect(result).toContain("export class TodoItem");
    expect(result).toContain("export class Person");
  });

  it("should separate classes with blank lines", () => {
    const tags: CodegenSupertag[] = [
      {
        id: "abc123",
        name: "First",
        className: "First",
        fields: [],
        metadata: { syncedAt: "2025-12-28T10:00:00Z", tagId: "abc123" },
      },
      {
        id: "def456",
        name: "Second",
        className: "Second",
        fields: [],
        metadata: { syncedAt: "2025-12-28T10:00:00Z", tagId: "def456" },
      },
    ];

    const result = generateEffectFile(tags, defaultOptions);

    // Should have at least one blank line between classes
    expect(result).toMatch(/\}\s*\n\s*\n.*export class Second/s);
  });

  it("should generate empty file with just header when no tags", () => {
    const result = generateEffectFile([], defaultOptions);

    expect(result).toContain("import { Schema }");
    expect(result).toContain("Generated by supertag-cli");
    expect(result).not.toContain("export class");
  });
});
