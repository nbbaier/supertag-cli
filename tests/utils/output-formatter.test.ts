/**
 * Tests for Output Formatter (Spec 054)
 *
 * Strategy pattern implementation for output formatting.
 * Tests written first following TDD.
 */

import { describe, it, expect } from "bun:test";
import { Writable } from "stream";

// Import types and interfaces to test
import type {
  OutputFormatter,
  OutputMode,
  FormatterOptions,
} from "../../src/utils/output-formatter";

// Helper to capture output for testing
function captureOutput(): { stream: NodeJS.WriteStream; getOutput: () => string } {
  let output = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  }) as unknown as NodeJS.WriteStream;
  return { stream, getOutput: () => output };
}

describe("OutputFormatter Interface (T-1.1)", () => {
  describe("OutputMode type", () => {
    it("should accept 'unix' as valid mode", () => {
      const mode: OutputMode = "unix";
      expect(mode).toBe("unix");
    });

    it("should accept 'pretty' as valid mode", () => {
      const mode: OutputMode = "pretty";
      expect(mode).toBe("pretty");
    });

    it("should accept 'json' as valid mode", () => {
      const mode: OutputMode = "json";
      expect(mode).toBe("json");
    });
  });

  describe("FormatterOptions interface", () => {
    it("should require mode property", () => {
      const options: FormatterOptions = { mode: "unix" };
      expect(options.mode).toBe("unix");
    });

    it("should accept optional humanDates", () => {
      const options: FormatterOptions = { mode: "pretty", humanDates: true };
      expect(options.humanDates).toBe(true);
    });

    it("should accept optional verbose", () => {
      const options: FormatterOptions = { mode: "pretty", verbose: true };
      expect(options.verbose).toBe(true);
    });

    it("should accept optional stream", () => {
      const { stream } = captureOutput();
      const options: FormatterOptions = { mode: "unix", stream };
      expect(options.stream).toBe(stream);
    });
  });

  describe("OutputFormatter interface methods", () => {
    // This test verifies the interface contract exists
    // Actual implementations are tested in their own describe blocks
    it("should define all required methods", () => {
      // Create a mock formatter to verify interface shape
      const mockFormatter: OutputFormatter = {
        value: (_value: unknown) => {},
        header: (_text: string, _emoji?: string) => {},
        table: (_headers: string[], _rows: (string | number | undefined)[][]) => {},
        record: (_fields: Record<string, unknown>) => {},
        list: (_items: string[], _bullet?: string) => {},
        divider: () => {},
        tip: (_message: string) => {},
        error: (_message: string) => {},
        finalize: () => {},
      };

      // Verify all methods exist
      expect(typeof mockFormatter.value).toBe("function");
      expect(typeof mockFormatter.header).toBe("function");
      expect(typeof mockFormatter.table).toBe("function");
      expect(typeof mockFormatter.record).toBe("function");
      expect(typeof mockFormatter.list).toBe("function");
      expect(typeof mockFormatter.divider).toBe("function");
      expect(typeof mockFormatter.tip).toBe("function");
      expect(typeof mockFormatter.error).toBe("function");
      expect(typeof mockFormatter.finalize).toBe("function");
    });
  });
});
