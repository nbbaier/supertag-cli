/**
 * T-1.2: Tests for naming utilities
 * TDD: RED phase - write tests before implementation
 */

import { describe, it, expect } from "bun:test";
import {
  toClassName,
  toPropertyName,
  toValidIdentifier,
  isReservedWord,
} from "../../src/codegen/naming";

describe("toClassName", () => {
  it("should convert simple name to PascalCase", () => {
    expect(toClassName("todo")).toBe("Todo");
    expect(toClassName("todoItem")).toBe("TodoItem");
    expect(toClassName("TodoItem")).toBe("TodoItem");
  });

  it("should handle spaces", () => {
    expect(toClassName("todo item")).toBe("TodoItem");
    expect(toClassName("My Todo Item")).toBe("MyTodoItem");
  });

  it("should handle special characters", () => {
    expect(toClassName("todo-item")).toBe("TodoItem");
    expect(toClassName("todo_item")).toBe("TodoItem");
    expect(toClassName("todo.item")).toBe("TodoItem");
  });

  it("should handle numbers", () => {
    expect(toClassName("todo123")).toBe("Todo123");
    expect(toClassName("123todo")).toBe("_123todo");
  });

  it("should handle reserved words by prefixing", () => {
    expect(toClassName("class")).toBe("Class_");
    expect(toClassName("function")).toBe("Function_");
  });

  it("should handle empty or whitespace", () => {
    expect(toClassName("")).toBe("_");
    expect(toClassName("   ")).toBe("_");
  });

  it("should handle unicode characters", () => {
    expect(toClassName("café")).toBe("Café");
    expect(toClassName("日本語")).toBe("日本語");
  });

  it("should strip emoji characters", () => {
    expect(toClassName("⚙️Vault")).toBe("Vault");
    expect(toClassName("🚀Rocket")).toBe("Rocket");
    expect(toClassName("Hello 👋 World")).toBe("HelloWorld");
    expect(toClassName("Task ✅")).toBe("Task");
  });

  it("should handle emoji-only strings", () => {
    expect(toClassName("🎉")).toBe("_");
    expect(toClassName("👍👎")).toBe("_");
  });
});

describe("toPropertyName", () => {
  it("should convert to camelCase", () => {
    expect(toPropertyName("Title")).toBe("title");
    expect(toPropertyName("DueDate")).toBe("dueDate");
    expect(toPropertyName("due date")).toBe("dueDate");
  });

  it("should handle spaces", () => {
    expect(toPropertyName("Due Date")).toBe("dueDate");
    expect(toPropertyName("my field name")).toBe("myFieldName");
  });

  it("should handle special characters", () => {
    expect(toPropertyName("field-name")).toBe("fieldName");
    expect(toPropertyName("field_name")).toBe("fieldName");
    expect(toPropertyName("field.name")).toBe("fieldName");
  });

  it("should handle reserved words", () => {
    expect(toPropertyName("class")).toBe("class_");
    expect(toPropertyName("function")).toBe("function_");
    expect(toPropertyName("if")).toBe("if_");
  });

  it("should handle numbers at start", () => {
    expect(toPropertyName("123field")).toBe("_123field");
    expect(toPropertyName("1st")).toBe("_1st");
  });

  it("should handle empty or whitespace", () => {
    expect(toPropertyName("")).toBe("_");
    expect(toPropertyName("   ")).toBe("_");
  });
});

describe("toValidIdentifier", () => {
  it("should convert to camelCase by default", () => {
    expect(toValidIdentifier("hello world", "camelCase")).toBe("helloWorld");
  });

  it("should convert to PascalCase", () => {
    expect(toValidIdentifier("hello world", "PascalCase")).toBe("HelloWorld");
  });

  it("should convert to snake_case", () => {
    expect(toValidIdentifier("hello world", "snake_case")).toBe("hello_world");
    expect(toValidIdentifier("HelloWorld", "snake_case")).toBe("hello_world");
  });

  it("should handle mixed input", () => {
    expect(toValidIdentifier("my-cool_thing", "camelCase")).toBe("myCoolThing");
    expect(toValidIdentifier("my-cool_thing", "PascalCase")).toBe("MyCoolThing");
    expect(toValidIdentifier("my-cool_thing", "snake_case")).toBe("my_cool_thing");
  });

  it("should escape reserved words in all styles", () => {
    expect(toValidIdentifier("class", "camelCase")).toBe("class_");
    expect(toValidIdentifier("class", "PascalCase")).toBe("Class_");
    expect(toValidIdentifier("class", "snake_case")).toBe("class_");
  });
});

describe("isReservedWord", () => {
  it("should identify JavaScript reserved words", () => {
    const reserved = [
      "break", "case", "catch", "continue", "debugger", "default",
      "delete", "do", "else", "finally", "for", "function", "if",
      "in", "instanceof", "new", "return", "switch", "this", "throw",
      "try", "typeof", "var", "void", "while", "with",
    ];

    reserved.forEach((word) => {
      expect(isReservedWord(word)).toBe(true);
    });
  });

  it("should identify strict mode reserved words", () => {
    const strictReserved = [
      "class", "const", "enum", "export", "extends", "import",
      "super", "implements", "interface", "let", "package",
      "private", "protected", "public", "static", "yield",
    ];

    strictReserved.forEach((word) => {
      expect(isReservedWord(word)).toBe(true);
    });
  });

  it("should not flag non-reserved words", () => {
    expect(isReservedWord("hello")).toBe(false);
    expect(isReservedWord("myVariable")).toBe(false);
    expect(isReservedWord("todoItem")).toBe(false);
  });

  it("should be case-sensitive", () => {
    expect(isReservedWord("Class")).toBe(false);
    expect(isReservedWord("class")).toBe(true);
    expect(isReservedWord("CLASS")).toBe(false);
  });
});
