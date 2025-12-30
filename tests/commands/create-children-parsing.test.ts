/**
 * Tests for CLI --children flag parsing
 *
 * Verifies that parseChildren() correctly handles:
 * - Plain text children
 * - JSON children with name/id/dataType
 * - Nested children (recursive structures)
 */

import { describe, it, expect } from "bun:test";
import type { ChildNodeInput } from "../../src/types";

/**
 * Recursively parse a child node object (from JSON)
 * Copied from src/commands/create.ts for testing
 */
function parseChildObject(obj: Record<string, unknown>): ChildNodeInput | null {
  if (!obj.name || typeof obj.name !== 'string') return null;

  const child: ChildNodeInput = { name: obj.name };

  if (typeof obj.id === 'string') {
    child.id = obj.id;
  }
  if (obj.dataType === 'url' || obj.dataType === 'reference') {
    child.dataType = obj.dataType;
  }

  // Recursively parse nested children
  if (Array.isArray(obj.children)) {
    const nestedChildren: ChildNodeInput[] = [];
    for (const nestedChild of obj.children) {
      if (typeof nestedChild === 'object' && nestedChild !== null) {
        const parsed = parseChildObject(nestedChild as Record<string, unknown>);
        if (parsed) nestedChildren.push(parsed);
      }
    }
    if (nestedChildren.length > 0) {
      child.children = nestedChildren;
    }
  }

  return child;
}

/**
 * Parse children from command line strings
 * Copied from src/commands/create.ts for testing
 */
function parseChildren(childrenStrings: string[]): ChildNodeInput[] {
  const children: ChildNodeInput[] = [];

  for (const str of childrenStrings) {
    const trimmed = str.trim();
    if (!trimmed) continue;

    // Try to parse as JSON first
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        const child = parseChildObject(parsed);
        if (child) {
          children.push(child);
        }
        continue;
      } catch {
        // Not valid JSON, treat as plain text
      }
    }

    // Plain text child node
    children.push({ name: trimmed });
  }

  return children;
}

describe("parseChildren", () => {
  describe("plain text children", () => {
    it("should parse simple text as child name", () => {
      const result = parseChildren(["Child 1", "Child 2"]);
      expect(result).toEqual([
        { name: "Child 1" },
        { name: "Child 2" },
      ]);
    });

    it("should trim whitespace", () => {
      const result = parseChildren(["  Child with spaces  "]);
      expect(result).toEqual([{ name: "Child with spaces" }]);
    });

    it("should skip empty strings", () => {
      const result = parseChildren(["", "Child", "  ", "Another"]);
      expect(result).toEqual([
        { name: "Child" },
        { name: "Another" },
      ]);
    });
  });

  describe("JSON children", () => {
    it("should parse JSON with name only", () => {
      const result = parseChildren(['{"name": "JSON Child"}']);
      expect(result).toEqual([{ name: "JSON Child" }]);
    });

    it("should parse JSON with id (reference)", () => {
      const result = parseChildren(['{"name": "Link", "id": "abc123"}']);
      expect(result).toEqual([{ name: "Link", id: "abc123" }]);
    });

    it("should parse JSON with dataType url", () => {
      const result = parseChildren(['{"name": "https://example.com", "dataType": "url"}']);
      expect(result).toEqual([{ name: "https://example.com", dataType: "url" }]);
    });

    it("should parse JSON with dataType reference", () => {
      const result = parseChildren(['{"name": "Ref", "id": "xyz", "dataType": "reference"}']);
      expect(result).toEqual([{ name: "Ref", id: "xyz", dataType: "reference" }]);
    });

    it("should ignore invalid dataType values", () => {
      const result = parseChildren(['{"name": "Test", "dataType": "invalid"}']);
      expect(result).toEqual([{ name: "Test" }]);
    });

    it("should treat invalid JSON as plain text", () => {
      const result = parseChildren(['{not valid json}']);
      expect(result).toEqual([{ name: "{not valid json}" }]);
    });

    it("should skip JSON without name", () => {
      const result = parseChildren(['{"id": "abc123"}']);
      expect(result).toEqual([]);
    });
  });

  describe("nested children", () => {
    it("should parse one level of nested children", () => {
      const result = parseChildren([
        '{"name": "Parent", "children": [{"name": "Child 1"}, {"name": "Child 2"}]}'
      ]);
      expect(result).toEqual([{
        name: "Parent",
        children: [
          { name: "Child 1" },
          { name: "Child 2" },
        ],
      }]);
    });

    it("should parse deeply nested children", () => {
      const result = parseChildren([
        '{"name": "Level 1", "children": [{"name": "Level 2", "children": [{"name": "Level 3"}]}]}'
      ]);
      expect(result).toEqual([{
        name: "Level 1",
        children: [{
          name: "Level 2",
          children: [{ name: "Level 3" }],
        }],
      }]);
    });

    it("should preserve id and dataType in nested children", () => {
      const result = parseChildren([
        '{"name": "Parent", "children": [{"name": "Link", "id": "abc", "dataType": "reference"}]}'
      ]);
      expect(result).toEqual([{
        name: "Parent",
        children: [{ name: "Link", id: "abc", dataType: "reference" }],
      }]);
    });

    it("should handle empty children array", () => {
      const result = parseChildren(['{"name": "Parent", "children": []}']);
      expect(result).toEqual([{ name: "Parent" }]);
    });

    it("should skip invalid nested children", () => {
      const result = parseChildren([
        '{"name": "Parent", "children": [{"id": "no-name"}, {"name": "Valid"}]}'
      ]);
      expect(result).toEqual([{
        name: "Parent",
        children: [{ name: "Valid" }],
      }]);
    });

    it("should handle workshop-style hierarchical structure", () => {
      const input = JSON.stringify({
        name: "Workshop Notes",
        children: [
          {
            name: "Key Concepts",
            children: [
              { name: "Concept 1" },
              { name: "Concept 2" },
            ],
          },
          {
            name: "Action Items",
            children: [
              { name: "Follow up with team" },
              { name: "Write documentation" },
            ],
          },
        ],
      });

      const result = parseChildren([input]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Workshop Notes");
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children![0].name).toBe("Key Concepts");
      expect(result[0].children![0].children).toHaveLength(2);
      expect(result[0].children![0].children![0].name).toBe("Concept 1");
      expect(result[0].children![1].name).toBe("Action Items");
      expect(result[0].children![1].children).toHaveLength(2);
    });
  });

  describe("mixed input", () => {
    it("should handle mix of plain text and JSON", () => {
      const result = parseChildren([
        "Plain text child",
        '{"name": "JSON child"}',
        "Another plain text",
      ]);
      expect(result).toEqual([
        { name: "Plain text child" },
        { name: "JSON child" },
        { name: "Another plain text" },
      ]);
    });

    it("should handle mix of flat and nested JSON", () => {
      const result = parseChildren([
        '{"name": "Flat"}',
        '{"name": "Nested", "children": [{"name": "Child"}]}',
      ]);
      expect(result).toEqual([
        { name: "Flat" },
        { name: "Nested", children: [{ name: "Child" }] },
      ]);
    });
  });
});
