/**
 * Local API Type Definitions and Zod Schemas
 * Spec: F-094 tana-local API Integration
 * Task: T-1.1
 *
 * Defines TypeScript types and Zod validation schemas for all
 * tana-local REST API interactions. Based on OpenAPI spec at
 * http://localhost:8262/openapi.json
 */

import { z } from "zod";

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Local API configuration
 */
export interface LocalApiConfig {
  /** Whether local API is enabled (default: true) */
  enabled: boolean;
  /** Bearer token from Tana Desktop > Settings > Local API */
  bearerToken?: string;
  /** API endpoint URL (default: http://localhost:8262) */
  endpoint: string;
}

export const LocalApiConfigSchema = z.object({
  enabled: z.boolean().default(true),
  bearerToken: z.string().optional(),
  endpoint: z.string().url().default("http://localhost:8262"),
});

/** Default local API endpoint */
export const DEFAULT_LOCAL_API_ENDPOINT = "http://localhost:8262";

// =============================================================================
// Health Check
// =============================================================================

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  timestamp: z.string(),
  nodeSpaceReady: z.boolean(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// =============================================================================
// Workspace Types
// =============================================================================

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  homeNodeId: z.string(),
});
export type LocalApiWorkspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceListResponseSchema = z.array(WorkspaceSchema);

// =============================================================================
// Node Types
// =============================================================================

export const NodeTagSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const SearchResultNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  breadcrumb: z.array(z.string()),
  tags: z.array(NodeTagSchema),
  tagIds: z.array(z.string()),
  workspaceId: z.string(),
  docType: z.string(),
  description: z.string().optional(),
  created: z.string(),
  inTrash: z.boolean(),
});
export type SearchResultNode = z.infer<typeof SearchResultNodeSchema>;

export const ReadNodeResponseSchema = z.object({
  markdown: z.string(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
});
export type ReadNodeResponse = z.infer<typeof ReadNodeResponseSchema>;

export const ChildNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(NodeTagSchema),
  tagIds: z.array(z.string()),
  childCount: z.number(),
  docType: z.string(),
  description: z.string().optional(),
  created: z.string(),
  inTrash: z.boolean(),
});

export const GetChildrenResponseSchema = z.object({
  children: z.array(ChildNodeSchema),
  total: z.number(),
  hasMore: z.boolean(),
});
export type GetChildrenResponse = z.infer<typeof GetChildrenResponseSchema>;

// =============================================================================
// Import (Create Nodes) Types
// =============================================================================

export const ImportRequestSchema = z.object({
  content: z.string().min(1, "Tana Paste content is required"),
});
export type ImportRequest = z.infer<typeof ImportRequestSchema>;

export const CreatedNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ImportResponseSchema = z.object({
  parentNodeId: z.string(),
  targetNodeId: z.string(),
  createdNodes: z.array(CreatedNodeSchema),
  message: z.string(),
});
export type ImportResponse = z.infer<typeof ImportResponseSchema>;

// =============================================================================
// Update Node Types
// =============================================================================

export const UpdateRequestSchema = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type UpdateRequest = z.infer<typeof UpdateRequestSchema>;

export const UpdateResponseSchema = z.object({
  nodeId: z.string(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  message: z.string(),
});
export type UpdateResponse = z.infer<typeof UpdateResponseSchema>;

// =============================================================================
// Tag Operation Types
// =============================================================================

export const TagOperationRequestSchema = z.object({
  action: z.enum(["add", "remove"]),
  tagIds: z.array(z.string()).min(1, "At least one tag ID is required"),
});
export type TagOperationRequest = z.infer<typeof TagOperationRequestSchema>;

export const TagOperationResultSchema = z.object({
  tagId: z.string(),
  tagName: z.string(),
  success: z.boolean(),
  message: z.string(),
});

export const TagOperationResponseSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string(),
  action: z.enum(["add", "remove"]),
  results: z.array(TagOperationResultSchema),
});
export type TagOperationResponse = z.infer<typeof TagOperationResponseSchema>;

// =============================================================================
// Field Types
// =============================================================================

export const FieldContentRequestSchema = z.object({
  content: z.string(),
});
export type FieldContentRequest = z.infer<typeof FieldContentRequestSchema>;

export const FieldContentResponseSchema = z.object({
  nodeId: z.string(),
  attributeId: z.string(),
  content: z.string(),
  message: z.string(),
});
export type FieldContentResponse = z.infer<typeof FieldContentResponseSchema>;

export const FieldOptionRequestSchema = z.object({
  optionId: z.string(),
});
export type FieldOptionRequest = z.infer<typeof FieldOptionRequestSchema>;

export const FieldOptionResponseSchema = z.object({
  nodeId: z.string(),
  attributeId: z.string(),
  optionId: z.string(),
  optionName: z.string(),
  message: z.string(),
});
export type FieldOptionResponse = z.infer<typeof FieldOptionResponseSchema>;

// =============================================================================
// Done / Undone Types
// =============================================================================

export const DoneRequestSchema = z.object({
  done: z.boolean(),
});
export type DoneRequest = z.infer<typeof DoneRequestSchema>;

export const DoneResponseSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string(),
  done: z.boolean(),
  message: z.string(),
});
export type DoneResponse = z.infer<typeof DoneResponseSchema>;

// =============================================================================
// Trash Types
// =============================================================================

export const TrashResponseSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string(),
  trashNodeId: z.string(),
  message: z.string(),
});
export type TrashResponse = z.infer<typeof TrashResponseSchema>;

// =============================================================================
// Tag Management Types
// =============================================================================

export const TagInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});
export type TagInfo = z.infer<typeof TagInfoSchema>;

export const TagListResponseSchema = z.array(TagInfoSchema);

export const CreateTagRequestSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  description: z.string().optional(),
  extendsTagIds: z.array(z.string()).default([]),
  showCheckbox: z.boolean().optional(),
});
export type CreateTagRequest = z.infer<typeof CreateTagRequestSchema>;

export const CreateTagResponseSchema = z.object({
  tagId: z.string(),
  tagName: z.string(),
  extendsTagNames: z.array(z.string()).optional(),
  message: z.string(),
});
export type CreateTagResponse = z.infer<typeof CreateTagResponseSchema>;

export const TagSchemaResponseSchema = z.object({
  markdown: z.string(),
});
export type TagSchemaResponse = z.infer<typeof TagSchemaResponseSchema>;

// =============================================================================
// Add Field to Tag Types
// =============================================================================

export const AddFieldToTagRequestSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  description: z.string().optional(),
  dataType: z.enum([
    "plain", "number", "date", "url", "email",
    "checkbox", "user", "instance", "options",
  ]),
  sourceTagId: z.string().optional(),
  options: z.array(z.string()).optional(),
  defaultValue: z.union([z.string(), z.boolean(), z.number()]).optional(),
  isMultiValue: z.boolean().default(false),
});
export type AddFieldToTagRequest = z.infer<typeof AddFieldToTagRequestSchema>;

export const AddFieldToTagResponseSchema = z.object({
  tagId: z.string(),
  tagName: z.string(),
  fieldId: z.string(),
  fieldName: z.string(),
  dataType: z.string(),
  message: z.string(),
});
export type AddFieldToTagResponse = z.infer<typeof AddFieldToTagResponseSchema>;

// =============================================================================
// Tag Checkbox Types
// =============================================================================

export const SetTagCheckboxRequestSchema = z.object({
  showCheckbox: z.boolean(),
  doneStateMapping: z.object({
    fieldId: z.string(),
    checkedValues: z.array(z.string()).min(1),
    uncheckedValues: z.array(z.string()).optional(),
  }).optional(),
});
export type SetTagCheckboxRequest = z.infer<typeof SetTagCheckboxRequestSchema>;

export const SetTagCheckboxResponseSchema = z.object({
  tagId: z.string(),
  tagName: z.string(),
  showCheckbox: z.boolean(),
  hasDoneStateMapping: z.boolean(),
  message: z.string(),
});
export type SetTagCheckboxResponse = z.infer<typeof SetTagCheckboxResponseSchema>;

// =============================================================================
// Calendar Types
// =============================================================================

export const CalendarNodeResponseSchema = z.object({
  nodeId: z.string(),
});
export type CalendarNodeResponse = z.infer<typeof CalendarNodeResponseSchema>;

export type CalendarGranularity = "day" | "week" | "month" | "year";
