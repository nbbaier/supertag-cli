/**
 * T-1.2: Naming Utilities
 *
 * Functions for converting Tana field/supertag names to valid TypeScript identifiers.
 */

/**
 * JavaScript reserved words that cannot be used as identifiers.
 */
const RESERVED_WORDS = new Set([
  // Keywords
  "break", "case", "catch", "continue", "debugger", "default", "delete",
  "do", "else", "finally", "for", "function", "if", "in", "instanceof",
  "new", "return", "switch", "this", "throw", "try", "typeof", "var",
  "void", "while", "with",
  // Future reserved words (strict mode)
  "class", "const", "enum", "export", "extends", "import", "super",
  // Strict mode reserved words
  "implements", "interface", "let", "package", "private", "protected",
  "public", "static", "yield",
  // Literals
  "null", "true", "false",
  // Additional TypeScript keywords
  "any", "boolean", "number", "string", "symbol", "type", "never",
  "unknown", "object", "undefined",
]);

/**
 * Check if a word is a JavaScript/TypeScript reserved word.
 */
export function isReservedWord(word: string): boolean {
  return RESERVED_WORDS.has(word);
}

/**
 * Escape a reserved word by appending underscore.
 * Also checks lowercase version to handle PascalCase reserved words like "Class".
 */
function escapeReserved(word: string): string {
  if (isReservedWord(word)) {
    return `${word}_`;
  }
  // Also check lowercase version for PascalCase reserved words (e.g., "Class" -> "class")
  if (isReservedWord(word.toLowerCase())) {
    return `${word}_`;
  }
  return word;
}

/**
 * Split a string into words based on separators and case changes.
 * Strips emojis and other problematic unicode symbols while preserving
 * regular letters from all languages.
 */
function splitWords(input: string): string[] {
  if (!input || !input.trim()) {
    return [];
  }

  // Strip emoji and symbol ranges while preserving letters
  // Emoji ranges: U+1F300-U+1F9FF, U+2600-U+26FF, U+2700-U+27BF
  // Also removes: dingbats, technical symbols, misc symbols
  const cleaned = input
    .replace(/[\u2600-\u26FF\u2700-\u27BF]/g, "")  // Dingbats, misc symbols
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")        // Extended emoji ranges
    .replace(/[\u{E000}-\u{F8FF}]/gu, "")          // Private use area
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")          // Variation selectors
    .replace(/[\u200B-\u200D\uFEFF]/g, "");        // Zero-width chars

  if (!cleaned.trim()) {
    return [];
  }

  // Replace separators with spaces, then handle camelCase/PascalCase
  const normalized = cleaned
    .replace(/[-_.]/g, " ")  // Replace separators with spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2")  // Split camelCase
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");  // Split consecutive caps

  return normalized
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Capitalize first letter, lowercase rest.
 */
function capitalize(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Convert a string to a valid identifier in the specified style.
 *
 * @param name - Input string (may contain spaces, special chars)
 * @param style - Naming convention to use
 * @returns Valid TypeScript identifier
 */
export function toValidIdentifier(
  name: string,
  style: "camelCase" | "PascalCase" | "snake_case"
): string {
  const words = splitWords(name);

  if (words.length === 0) {
    return "_";
  }

  let result: string;

  switch (style) {
    case "camelCase":
      result = words
        .map((word, i) => (i === 0 ? word.toLowerCase() : capitalize(word)))
        .join("");
      break;

    case "PascalCase":
      result = words.map(capitalize).join("");
      break;

    case "snake_case":
      result = words.map((w) => w.toLowerCase()).join("_");
      break;

    default:
      result = words.join("");
  }

  // Handle numeric prefix - prepend underscore
  if (/^[0-9]/.test(result)) {
    result = "_" + result;
  }

  // Escape reserved words
  return escapeReserved(result);
}

/**
 * Convert a supertag name to a valid class name (PascalCase).
 *
 * @param name - Supertag name from Tana
 * @returns Valid TypeScript class name
 */
export function toClassName(name: string): string {
  return toValidIdentifier(name, "PascalCase");
}

/**
 * Convert a field name to a valid property name (camelCase).
 *
 * @param name - Field name from Tana
 * @returns Valid TypeScript property name
 */
export function toPropertyName(name: string): string {
  return toValidIdentifier(name, "camelCase");
}
