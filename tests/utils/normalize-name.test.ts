/**
 * Tests for normalizeName utility
 * Spec 020: Schema Consolidation - T-2.1
 */

import { describe, it, expect } from "bun:test";
import { normalizeName } from "../../src/utils/normalize-name";

describe("normalizeName", () => {
  it("should convert to lowercase", () => {
    expect(normalizeName("DueDate")).toBe("duedate");
    expect(normalizeName("PRIORITY")).toBe("priority");
  });

  it("should remove spaces", () => {
    expect(normalizeName("Due Date")).toBe("duedate");
    expect(normalizeName("Created At")).toBe("createdat");
  });

  it("should remove dashes", () => {
    expect(normalizeName("due-date")).toBe("duedate");
    expect(normalizeName("created-at")).toBe("createdat");
  });

  it("should remove underscores", () => {
    expect(normalizeName("due_date")).toBe("duedate");
    expect(normalizeName("created_at")).toBe("createdat");
  });

  it("should remove emojis", () => {
    expect(normalizeName("Priority 🔥")).toBe("priority");
    expect(normalizeName("📅 Due Date")).toBe("duedate");
  });

  it("should remove special characters", () => {
    expect(normalizeName("Status (draft)")).toBe("statusdraft");
    expect(normalizeName("URL/Link")).toBe("urllink");
  });

  it("should handle mixed cases", () => {
    expect(normalizeName("Due-Date (Estimated) 📅")).toBe("duedateestimated");
  });

  it("should trim whitespace", () => {
    expect(normalizeName("  Due Date  ")).toBe("duedate");
  });

  it("should handle empty string", () => {
    expect(normalizeName("")).toBe("");
  });

  it("should handle single word", () => {
    expect(normalizeName("priority")).toBe("priority");
    expect(normalizeName("Priority")).toBe("priority");
  });
});
