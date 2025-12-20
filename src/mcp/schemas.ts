/**
 * MCP Tool Schemas
 *
 * Zod schemas for all Tana MCP tools with descriptions for AI documentation.
 */

import { z } from 'zod';

// Common schemas
// Note: nullable() is needed because some LLMs (like Ollama) send null instead of omitting optional fields
export const workspaceSchema = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v ?? undefined)
  .describe('Workspace alias or node ID (uses default if not specified)');

export const limitSchema = z
  .number()
  .min(1)
  .max(1000)
  .default(20)
  .describe('Maximum number of results to return');

// Date range schemas
export const dateRangeSchema = {
  createdAfter: z
    .string()
    .optional()
    .describe('Filter nodes created after this date (YYYY-MM-DD or ISO 8601)'),
  createdBefore: z
    .string()
    .optional()
    .describe('Filter nodes created before this date (YYYY-MM-DD or ISO 8601)'),
  updatedAfter: z
    .string()
    .optional()
    .describe('Filter nodes updated after this date (YYYY-MM-DD or ISO 8601)'),
  updatedBefore: z
    .string()
    .optional()
    .describe('Filter nodes updated before this date (YYYY-MM-DD or ISO 8601)'),
};

// tana_search
export const searchSchema = z.object({
  query: z.string().min(1).describe('Full-text search query'),
  workspace: workspaceSchema,
  limit: limitSchema,
  raw: z
    .boolean()
    .default(false)
    .describe('Return raw results without supertag enrichment or ancestor resolution'),
  includeAncestor: z
    .boolean()
    .default(true)
    .describe('Include nearest ancestor with supertag for context. When a match is a nested fragment, shows the containing project/meeting/etc.'),
  ...dateRangeSchema,
});
export type SearchInput = z.infer<typeof searchSchema>;

// tana_tagged
export const taggedSchema = z.object({
  tagname: z.string().min(1).describe('Supertag name to filter by (e.g., "todo", "meeting", "contact")'),
  workspace: workspaceSchema,
  limit: limitSchema,
  orderBy: z
    .enum(['created', 'updated'])
    .default('created')
    .describe('Sort order for results'),
  caseInsensitive: z
    .boolean()
    .default(false)
    .describe('Enable case-insensitive tag matching'),
  ...dateRangeSchema,
});
export type TaggedInput = z.infer<typeof taggedSchema>;

// tana_stats
export const statsSchema = z.object({
  workspace: workspaceSchema,
});
export type StatsInput = z.infer<typeof statsSchema>;

// tana_supertags
export const supertagsSchema = z.object({
  workspace: workspaceSchema,
  limit: limitSchema,
});
export type SupertagsInput = z.infer<typeof supertagsSchema>;

// tana_node
export const nodeSchema = z.object({
  nodeId: z.string().min(1).describe('Tana node ID (e.g., "abc123xyz")'),
  workspace: workspaceSchema,
  depth: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe('Depth of child traversal (0 = no children, 1 = direct children, etc.)'),
});
export type NodeInput = z.infer<typeof nodeSchema>;

// tana_create (Phase 2)
export const createSchema = z.object({
  supertag: z
    .string()
    .min(1)
    .describe('Supertag name (e.g., "todo") or comma-separated for multiple'),
  name: z
    .string()
    .min(1)
    .describe(
      'Node name/title. IMPORTANT: Do NOT use [[text^id]] inline reference syntax here - it will appear as plain text. Use the children parameter for references.'
    ),
  fields: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional()
    .describe('Field values as key-value pairs (e.g., {"Status": "Done", "Tags": ["urgent"]})'),
  children: z
    .array(
      z.object({
        name: z.string().describe('Child node name. For inline refs: <span data-inlineref-node="NODE_ID">Text</span>'),
        id: z.string().optional().describe('Optional node ID to create this child as a reference node (dataType: reference)'),
        dataType: z.enum(['url', 'reference']).optional().describe('Data type: "url" for clickable links, "reference" for node links (requires id)'),
      })
    )
    .optional()
    .describe(
      'Child nodes. Plain text: [{"name": "Child"}]. Reference node: {"name": "Link", "id": "abc123"}. Inline ref in text: {"name": "See <span data-inlineref-node=\\"xyz\\">Related</span>"}'
    ),
  workspace: workspaceSchema,
  target: z
    .string()
    .optional()
    .describe('Target node ID (INBOX, SCHEMA, or specific node ID)'),
  dryRun: z
    .boolean()
    .default(false)
    .describe('Validate without actually creating the node'),
});
export type CreateInput = z.infer<typeof createSchema>;

// tana_sync (Phase 2)
export const syncSchema = z.object({
  action: z
    .enum(['index', 'status'])
    .default('index')
    .describe('Action to perform: "index" to reindex, "status" to check sync status'),
  workspace: workspaceSchema,
});
export type SyncInput = z.infer<typeof syncSchema>;

// tana_semantic_search
export const semanticSearchSchema = z.object({
  query: z.string().min(1).describe('Natural language search query for semantic similarity matching'),
  workspace: workspaceSchema,
  limit: limitSchema,
  minSimilarity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum similarity threshold (0-1). Results below this similarity are excluded.'),
  raw: z
    .boolean()
    .default(false)
    .describe('Return raw results without supertag enrichment or ancestor resolution'),
  includeContents: z
    .boolean()
    .default(false)
    .describe('Include full node contents (fields, children, tags) in results. Provides richer context but larger response.'),
  depth: z
    .number()
    .min(0)
    .max(3)
    .default(0)
    .describe('Child traversal depth when includeContents is true (0 = no children, 1 = direct children, etc.). Max 3.'),
  includeAncestor: z
    .boolean()
    .default(true)
    .describe('Include nearest ancestor with supertag for context. When a match is a nested fragment, shows the containing project/meeting/etc.'),
});
export type SemanticSearchInput = z.infer<typeof semanticSearchSchema>;

/**
 * Convert Zod schema to JSON Schema for MCP tool registration
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // For MCP, we use the Zod schema's JSON representation
  // The MCP SDK accepts Zod schemas directly in newer versions,
  // but for compatibility we convert to JSON Schema format
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType;
      properties[key] = zodTypeToJsonSchema(zodValue);

      // Check if required (not optional and not has default)
      if (!isOptional(zodValue)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: 'object' };
}

function zodTypeToJsonSchema(zodType: z.ZodType): Record<string, unknown> {
  const description = zodType.description;
  const base: Record<string, unknown> = {};

  if (description) {
    base.description = description;
  }

  // Unwrap optional/default
  let innerType = zodType;
  if (innerType instanceof z.ZodOptional) {
    innerType = innerType.unwrap();
  }
  if (innerType instanceof z.ZodDefault) {
    // Get default value - handle both zod v3 and v4
    const def = innerType._def as { defaultValue?: unknown; innerType?: z.ZodType };
    if (typeof def.defaultValue === 'function') {
      base.default = def.defaultValue();
    } else if (def.defaultValue !== undefined) {
      base.default = def.defaultValue;
    }
    if (def.innerType) {
      innerType = def.innerType;
    }
  }

  if (innerType instanceof z.ZodString) {
    return { ...base, type: 'string' };
  }
  if (innerType instanceof z.ZodNumber) {
    return { ...base, type: 'number' };
  }
  if (innerType instanceof z.ZodBoolean) {
    return { ...base, type: 'boolean' };
  }
  if (innerType instanceof z.ZodEnum) {
    return { ...base, type: 'string', enum: innerType._def.values };
  }
  if (innerType instanceof z.ZodArray) {
    return { ...base, type: 'array', items: zodTypeToJsonSchema(innerType.element) };
  }
  if (innerType instanceof z.ZodRecord) {
    return { ...base, type: 'object', additionalProperties: true };
  }
  if (innerType instanceof z.ZodUnion) {
    return { ...base, oneOf: innerType._def.options.map(zodTypeToJsonSchema) };
  }

  return { ...base, type: 'string' };
}

function isOptional(zodType: z.ZodType): boolean {
  if (zodType instanceof z.ZodOptional) return true;
  if (zodType instanceof z.ZodDefault) return true;
  if (zodType instanceof z.ZodNullable) return true;
  // Handle Zod v4 pipe (used by .transform()) - check the 'in' schema
  const def = zodType._def as { type?: string; in?: z.ZodType; schema?: z.ZodType };
  if (def.type === 'pipe' && def.in) {
    return isOptional(def.in);
  }
  // Handle transform (ZodEffects in Zod v3) - check the inner schema
  if (def.schema) {
    return isOptional(def.schema);
  }
  return false;
}

/**
 * Parse date range strings into UNIX timestamps (ms)
 */
export function parseDateRange(input: {
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}): {
  createdAfter?: number;
  createdBefore?: number;
  updatedAfter?: number;
  updatedBefore?: number;
} {
  const result: {
    createdAfter?: number;
    createdBefore?: number;
    updatedAfter?: number;
    updatedBefore?: number;
  } = {};

  const parseDate = (dateStr: string): number => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD or ISO 8601`);
    }
    return date.getTime();
  };

  if (input.createdAfter) {
    result.createdAfter = parseDate(input.createdAfter);
  }
  if (input.createdBefore) {
    result.createdBefore = parseDate(input.createdBefore);
  }
  if (input.updatedAfter) {
    result.updatedAfter = parseDate(input.updatedAfter);
  }
  if (input.updatedBefore) {
    result.updatedBefore = parseDate(input.updatedBefore);
  }

  return result;
}
