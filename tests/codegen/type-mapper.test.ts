/**
 * T-1.3: Tests for type mapper
 * TDD: RED phase - write tests before implementation
 */

import { describe, it, expect } from "bun:test";
import {
  mapDataTypeToEffect,
  wrapOptional,
  getBaseEffectType,
} from "../../src/codegen/type-mapper";
import type { DataType } from "../../src/utils/infer-data-type";

describe("getBaseEffectType", () => {
  it("should map text to Schema.String", () => {
    expect(getBaseEffectType("text")).toBe("Schema.String");
  });

  it("should map number to Schema.Number", () => {
    expect(getBaseEffectType("number")).toBe("Schema.Number");
  });

  it("should map date to Schema.DateFromString", () => {
    expect(getBaseEffectType("date")).toBe("Schema.DateFromString");
  });

  it("should map checkbox to Schema.Boolean", () => {
    expect(getBaseEffectType("checkbox")).toBe("Schema.Boolean");
  });

  it("should map url to Schema.String with URL validation", () => {
    const result = getBaseEffectType("url");
    expect(result).toContain("Schema.String");
    expect(result).toContain("pattern");
    expect(result).toContain("https?");
  });

  it("should map email to Schema.String with email validation", () => {
    const result = getBaseEffectType("email");
    expect(result).toContain("Schema.String");
    expect(result).toContain("pattern");
    expect(result).toContain("@");
  });

  it("should map reference to Schema.String", () => {
    expect(getBaseEffectType("reference")).toBe("Schema.String");
  });

  it("should map options to Schema.String (default)", () => {
    expect(getBaseEffectType("options")).toBe("Schema.String");
  });

  it("should default to Schema.String for unknown types", () => {
    expect(getBaseEffectType(null)).toBe("Schema.String");
    expect(getBaseEffectType(undefined)).toBe("Schema.String");
    expect(getBaseEffectType("unknown" as DataType)).toBe("Schema.String");
  });
});

describe("wrapOptional", () => {
  describe("option strategy", () => {
    it("should wrap with Schema.optionalWith using Option", () => {
      const result = wrapOptional("Schema.String", "option");
      expect(result).toBe('Schema.optionalWith(Schema.String, { as: "Option" })');
    });

    it("should wrap complex types", () => {
      const result = wrapOptional(
        'Schema.String.pipe(Schema.pattern(/^https?:\\/\\///))',
        "option"
      );
      expect(result).toContain("Schema.optionalWith");
      expect(result).toContain('{ as: "Option" }');
    });
  });

  describe("undefined strategy", () => {
    it("should use Schema.optional", () => {
      const result = wrapOptional("Schema.String", "undefined");
      expect(result).toBe("Schema.optional(Schema.String)");
    });
  });

  describe("nullable strategy", () => {
    it("should use Schema.NullOr", () => {
      const result = wrapOptional("Schema.String", "nullable");
      expect(result).toBe("Schema.NullOr(Schema.String)");
    });
  });
});

describe("mapDataTypeToEffect", () => {
  describe("required fields", () => {
    it("should return unwrapped type for required fields", () => {
      expect(mapDataTypeToEffect("text", { isOptional: false })).toBe("Schema.String");
      expect(mapDataTypeToEffect("number", { isOptional: false })).toBe("Schema.Number");
    });
  });

  describe("optional fields with option strategy", () => {
    it("should wrap text in Option", () => {
      const result = mapDataTypeToEffect("text", {
        isOptional: true,
        optionalStrategy: "option",
      });
      expect(result).toBe('Schema.optionalWith(Schema.String, { as: "Option" })');
    });

    it("should wrap number in Option", () => {
      const result = mapDataTypeToEffect("number", {
        isOptional: true,
        optionalStrategy: "option",
      });
      expect(result).toBe('Schema.optionalWith(Schema.Number, { as: "Option" })');
    });

    it("should wrap date in Option", () => {
      const result = mapDataTypeToEffect("date", {
        isOptional: true,
        optionalStrategy: "option",
      });
      expect(result).toBe('Schema.optionalWith(Schema.DateFromString, { as: "Option" })');
    });

    it("should wrap checkbox in Option", () => {
      const result = mapDataTypeToEffect("checkbox", {
        isOptional: true,
        optionalStrategy: "option",
      });
      expect(result).toBe('Schema.optionalWith(Schema.Boolean, { as: "Option" })');
    });
  });

  describe("optional fields with undefined strategy", () => {
    it("should use Schema.optional", () => {
      const result = mapDataTypeToEffect("text", {
        isOptional: true,
        optionalStrategy: "undefined",
      });
      expect(result).toBe("Schema.optional(Schema.String)");
    });
  });

  describe("optional fields with nullable strategy", () => {
    it("should use Schema.NullOr", () => {
      const result = mapDataTypeToEffect("text", {
        isOptional: true,
        optionalStrategy: "nullable",
      });
      expect(result).toBe("Schema.NullOr(Schema.String)");
    });
  });

  describe("default behavior", () => {
    it("should default to option strategy when not specified", () => {
      const result = mapDataTypeToEffect("text", { isOptional: true });
      expect(result).toContain("optionalWith");
    });

    it("should default to required when isOptional not specified", () => {
      const result = mapDataTypeToEffect("text", {});
      expect(result).toBe("Schema.String");
    });
  });
});
