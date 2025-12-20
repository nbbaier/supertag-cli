/**
 * TDD Test Suite for Tana Paste Converter
 *
 * RED phase: These tests will fail until we implement the converter
 *
 * Tana Paste Format:
 * - Hierarchical text format using bullet points and indentation
 * - Each line starts with "- " (dash space)
 * - Indentation = 2 spaces per level
 * - Fields use ":: " separator (e.g., "- Status:: Done")
 * - Code blocks use ``` delimiters
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { TanaPasteConverter } from "../src/converters/tana-paste";

describe("TanaPasteConverter - JSON to Tana Paste (🔴 RED)", () => {
  let converter: TanaPasteConverter;

  beforeAll(() => {
    converter = new TanaPasteConverter();
  });

  test("should convert simple node to Tana Paste", () => {
    const input = {
      name: "My Task",
    };

    const result = converter.jsonToTana(input);

    expect(result).toBe("- My Task\n");
  });

  test("should convert node with field to Tana Paste", () => {
    const input = {
      name: "Task",
      Status: "Done",
    };

    const result = converter.jsonToTana(input);

    expect(result).toBe("- Task\n  - Status:: Done\n");
  });

  test("should convert node with multiple fields", () => {
    const input = {
      name: "Meeting Notes",
      Date: "2025-11-30",
      Attendees: "Angela, Kai",
      Status: "Complete",
    };

    const result = converter.jsonToTana(input);

    expect(result).toContain("- Meeting Notes\n");
    expect(result).toContain("  - Date:: 2025-11-30\n");
    expect(result).toContain("  - Attendees:: Angela, Kai\n");
    expect(result).toContain("  - Status:: Complete\n");
  });

  test("should convert node with children", () => {
    const input = {
      name: "Project",
      children: [{ name: "Task 1" }, { name: "Task 2" }],
    };

    const result = converter.jsonToTana(input);

    expect(result).toBe("- Project\n  - Task 1\n  - Task 2\n");
  });

  test("should convert nested hierarchy", () => {
    const input = {
      name: "Project",
      children: [
        {
          name: "Phase 1",
          children: [{ name: "Task 1.1" }, { name: "Task 1.2" }],
        },
        {
          name: "Phase 2",
          children: [{ name: "Task 2.1" }],
        },
      ],
    };

    const result = converter.jsonToTana(input);

    expect(result).toContain("- Project\n");
    expect(result).toContain("  - Phase 1\n");
    expect(result).toContain("    - Task 1.1\n");
    expect(result).toContain("    - Task 1.2\n");
    expect(result).toContain("  - Phase 2\n");
    expect(result).toContain("    - Task 2.1\n");
  });

  test("should convert node with fields and children", () => {
    const input = {
      name: "Task",
      Status: "In Progress",
      children: [{ name: "Subtask 1" }, { name: "Subtask 2" }],
    };

    const result = converter.jsonToTana(input);

    expect(result).toContain("- Task\n");
    expect(result).toContain("  - Status:: In Progress\n");
    expect(result).toContain("  - Subtask 1\n");
    expect(result).toContain("  - Subtask 2\n");
  });

  test("should convert array of nodes", () => {
    const input = [{ name: "Node 1" }, { name: "Node 2" }];

    const result = converter.jsonToTana(input);

    expect(result).toBe("- Node 1\n- Node 2\n");
  });

  test("should handle empty name with fields only", () => {
    const input = {
      Status: "Done",
      Priority: "High",
    };

    const result = converter.jsonToTana(input);

    // No name line, just fields
    expect(result).toContain("- Status:: Done\n");
    expect(result).toContain("- Priority:: High\n");
  });

  test("should convert multi-valued field (array)", () => {
    const input = {
      name: "Task",
      Tags: [{ name: "urgent" }, { name: "important" }],
    };

    const result = converter.jsonToTana(input);

    expect(result).toContain("- Task\n");
    expect(result).toContain("  - Tags::\n");
    expect(result).toContain("    - urgent\n");
    expect(result).toContain("    - important\n");
  });

  test("should convert nested field (object)", () => {
    const input = {
      name: "Person",
      Address: {
        Street: "123 Main St",
        City: "Zurich",
      },
    };

    const result = converter.jsonToTana(input);

    expect(result).toContain("- Person\n");
    expect(result).toContain("  - Address::\n");
    expect(result).toContain("    - Street:: 123 Main St\n");
    expect(result).toContain("    - City:: Zurich\n");
  });

  test("should handle code blocks in name", () => {
    const input = {
      name: "```\nfunction hello() {\n  console.log('hi');\n}\n```",
    };

    const result = converter.jsonToTana(input);

    expect(result).toContain("```");
    expect(result).toContain("function hello()");
  });
});

describe("TanaPasteConverter - Tana Paste to JSON (🔴 RED)", () => {
  let converter: TanaPasteConverter;

  beforeAll(() => {
    converter = new TanaPasteConverter();
  });

  test("should parse simple node from Tana Paste", () => {
    const input = "- My Task\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([{ name: "My Task" }]);
  });

  test("should parse node with field", () => {
    const input = "- Task\n  - Status:: Done\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([
      {
        name: "Task",
        Status: "Done",
      },
    ]);
  });

  test("should parse node with multiple fields", () => {
    const input = "- Meeting\n  - Date:: 2025-11-30\n  - Status:: Complete\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([
      {
        name: "Meeting",
        Date: "2025-11-30",
        Status: "Complete",
      },
    ]);
  });

  test("should parse node with children", () => {
    const input = "- Project\n  - Task 1\n  - Task 2\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([
      {
        name: "Project",
        children: [{ name: "Task 1" }, { name: "Task 2" }],
      },
    ]);
  });

  test("should parse nested hierarchy", () => {
    const input = "- Project\n  - Phase 1\n    - Task 1.1\n    - Task 1.2\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([
      {
        name: "Project",
        children: [
          {
            name: "Phase 1",
            children: [{ name: "Task 1.1" }, { name: "Task 1.2" }],
          },
        ],
      },
    ]);
  });

  test("should parse multi-valued field", () => {
    const input = "- Task\n  - Tags::\n    - urgent\n    - important\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([
      {
        name: "Task",
        Tags: [{ name: "urgent" }, { name: "important" }],
      },
    ]);
  });

  test("should parse multiple root nodes", () => {
    const input = "- Node 1\n- Node 2\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([{ name: "Node 1" }, { name: "Node 2" }]);
  });

  test("should ignore empty lines", () => {
    const input = "- Task 1\n\n- Task 2\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([{ name: "Task 1" }, { name: "Task 2" }]);
  });

  test("should handle field with empty value", () => {
    const input = "- Task\n  - Status::\n    - In Progress\n";

    const result = converter.tanaToJson(input);

    expect(result).toEqual([
      {
        name: "Task",
        Status: [{ name: "In Progress" }],
      },
    ]);
  });
});

describe("TanaPasteConverter - Round-trip Conversion (🔴 RED)", () => {
  let converter: TanaPasteConverter;

  beforeAll(() => {
    converter = new TanaPasteConverter();
  });

  test("should round-trip simple node", () => {
    const original = { name: "Task" };

    const tana = converter.jsonToTana(original);
    const json = converter.tanaToJson(tana);

    expect(json).toEqual([original]);
  });

  test("should round-trip node with fields", () => {
    const original = {
      name: "Task",
      Status: "Done",
      Priority: "High",
    };

    const tana = converter.jsonToTana(original);
    const json = converter.tanaToJson(tana);

    expect(json[0]).toMatchObject(original);
  });

  test("should round-trip nested hierarchy", () => {
    const original = {
      name: "Project",
      children: [
        {
          name: "Phase 1",
          children: [{ name: "Task 1.1" }],
        },
      ],
    };

    const tana = converter.jsonToTana(original);
    const json = converter.tanaToJson(tana);

    expect(json).toEqual([original]);
  });
});
