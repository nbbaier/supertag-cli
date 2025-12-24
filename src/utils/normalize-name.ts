/**
 * Normalize a field/supertag name for matching
 *
 * Handles kebab-case, camelCase, spaces, emojis.
 * Extracted from SchemaRegistry for reuse (Spec 020: Schema Consolidation - T-2.1)
 *
 * @param name - The name to normalize
 * @returns Lowercase name with special characters, spaces, dashes, and underscores removed
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove emojis and special chars
    .replace(/[\s-_]+/g, '')  // Remove spaces, dashes, underscores
    .trim();
}
