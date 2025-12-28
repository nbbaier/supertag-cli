/**
 * T-1.1: Tests for codegen types
 * TDD: RED phase - write tests before implementation
 */

import { describe, it, expect } from "bun:test";
import type {
  CodegenOptions,
  CodegenSupertag,
  CodegenField,
  GenerationResult,
  GeneratedFile,
} from "../../src/codegen/types";

describe("CodegenOptions", () => {
  it("should define required outputPath", () => {
    const options: CodegenOptions = {
      outputPath: "./generated/schemas.ts",
      format: "effect",
      optionalStrategy: "option",
      naming: "camelCase",
      includeMetadata: true,
      split: false,
      includeInherited: true,
    };

    expect(options.outputPath).toBe("./generated/schemas.ts");
  });

  it("should allow optional tags filter", () => {
    const options: CodegenOptions = {
      outputPath: "./out.ts",
      tags: ["TodoItem", "Person"],
      format: "effect",
      optionalStrategy: "option",
      naming: "camelCase",
      includeMetadata: false,
      split: false,
      includeInherited: true,
    };

    expect(options.tags).toEqual(["TodoItem", "Person"]);
  });

  it("should support all optional strategies", () => {
    const strategies: CodegenOptions["optionalStrategy"][] = [
      "option",
      "undefined",
      "nullable",
    ];

    strategies.forEach((strategy) => {
      const options: CodegenOptions = {
        outputPath: "./out.ts",
        format: "effect",
        optionalStrategy: strategy,
        naming: "camelCase",
        includeMetadata: false,
        split: false,
        includeInherited: true,
      };
      expect(options.optionalStrategy).toBe(strategy);
    });
  });

  it("should support all naming conventions", () => {
    const namings: CodegenOptions["naming"][] = [
      "camelCase",
      "PascalCase",
      "snake_case",
    ];

    namings.forEach((naming) => {
      const options: CodegenOptions = {
        outputPath: "./out.ts",
        format: "effect",
        optionalStrategy: "option",
        naming,
        includeMetadata: false,
        split: false,
        includeInherited: true,
      };
      expect(options.naming).toBe(naming);
    });
  });
});

describe("CodegenField", () => {
  it("should store original and property names", () => {
    const field: CodegenField = {
      originalName: "Due Date",
      propertyName: "dueDate",
      effectSchema: "Schema.String",
      isOptional: true,
    };

    expect(field.originalName).toBe("Due Date");
    expect(field.propertyName).toBe("dueDate");
  });

  it("should include optional comment", () => {
    const field: CodegenField = {
      originalName: "Priority",
      propertyName: "priority",
      effectSchema: "Schema.String",
      comment: "Task priority level",
      isOptional: true,
    };

    expect(field.comment).toBe("Task priority level");
  });

  it("should track optional flag", () => {
    const required: CodegenField = {
      originalName: "id",
      propertyName: "id",
      effectSchema: "Schema.String",
      isOptional: false,
    };

    const optional: CodegenField = {
      originalName: "notes",
      propertyName: "notes",
      effectSchema: "Schema.String",
      isOptional: true,
    };

    expect(required.isOptional).toBe(false);
    expect(optional.isOptional).toBe(true);
  });
});

describe("CodegenSupertag", () => {
  it("should store tag metadata", () => {
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

    expect(tag.name).toBe("TodoItem");
    expect(tag.className).toBe("TodoItem");
    expect(tag.metadata.tagId).toBe("abc123");
  });

  it("should include fields array", () => {
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

    expect(tag.fields.length).toBe(1);
    expect(tag.fields[0].propertyName).toBe("title");
  });

  it("should allow optional parent class name for inheritance", () => {
    const childTag: CodegenSupertag = {
      id: "child123",
      name: "WorkTask",
      className: "WorkTask",
      fields: [],
      parentClassName: "TodoItem",
      metadata: {
        syncedAt: "2025-12-28T10:00:00Z",
        tagId: "child123",
      },
    };

    expect(childTag.parentClassName).toBe("TodoItem");
  });
});

describe("GenerationResult", () => {
  it("should contain generated files", () => {
    const result: GenerationResult = {
      files: [
        { path: "./schemas.ts", content: "// generated" },
      ],
      stats: {
        supertagsProcessed: 5,
        fieldsProcessed: 20,
        filesGenerated: 1,
      },
    };

    expect(result.files.length).toBe(1);
    expect(result.stats.supertagsProcessed).toBe(5);
  });
});

describe("GeneratedFile", () => {
  it("should store path and content", () => {
    const file: GeneratedFile = {
      path: "./generated/TodoItem.ts",
      content: 'import { Schema } from "effect";\n\nexport class TodoItem...',
    };

    expect(file.path).toBe("./generated/TodoItem.ts");
    expect(file.content).toContain("Schema");
  });
});
