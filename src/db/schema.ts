/**
 * SQLite Schema for Tana Index
 *
 * Drizzle ORM schema definitions for storing parsed Tana data
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Nodes table - All Tana nodes with metadata
 */
export const nodes = sqliteTable(
  "nodes",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    parentId: text("parent_id"),
    nodeType: text("node_type"), // 'node', 'supertag', 'field', 'trash'
    created: integer("created"),
    updated: integer("updated"),
    doneAt: integer("done_at"), // Completion timestamp from props._done
    rawData: text("raw_data"), // JSON stringified NodeDump
  },
  (table) => ({
    parentIdx: index("idx_nodes_parent").on(table.parentId),
    typeIdx: index("idx_nodes_type").on(table.nodeType),
    nameIdx: index("idx_nodes_name").on(table.name),
    doneAtIdx: index("idx_nodes_done_at").on(table.doneAt),
  })
);

/**
 * Supertags table - Detected supertags with metadata
 */
export const supertags = sqliteTable(
  "supertags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nodeId: text("node_id").notNull(),
    tagName: text("tag_name").notNull(),
    tagId: text("tag_id").notNull(),
    color: text("color"),
  },
  (table) => ({
    nodeIdx: index("idx_supertags_node").on(table.nodeId),
    nameIdx: index("idx_supertags_name").on(table.tagName),
    tagIdIdx: index("idx_supertags_tagid").on(table.tagId),
  })
);

/**
 * Fields table - Field definitions and values
 */
export const fields = sqliteTable(
  "fields",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nodeId: text("node_id").notNull(),
    fieldName: text("field_name").notNull(),
    fieldId: text("field_id").notNull(),
  },
  (table) => ({
    nodeIdx: index("idx_fields_node").on(table.nodeId),
    nameIdx: index("idx_fields_name").on(table.fieldName),
    fieldIdIdx: index("idx_fields_fieldid").on(table.fieldId),
  })
);

/**
 * References table - Node relationships (inline refs, parent-child, etc)
 */
export const references = sqliteTable(
  "references",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fromNode: text("from_node").notNull(),
    toNode: text("to_node").notNull(),
    referenceType: text("reference_type").notNull(), // 'inline_ref', 'parent', 'child'
  },
  (table) => ({
    fromIdx: index("idx_references_from").on(table.fromNode),
    toIdx: index("idx_references_to").on(table.toNode),
    typeIdx: index("idx_references_type").on(table.referenceType),
  })
);

/**
 * Field Names table - Maps field IDs to human-readable names
 * Extracted from supertag definitions during indexing
 */
export const fieldNames = sqliteTable(
  "field_names",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fieldId: text("field_id").notNull().unique(),
    fieldName: text("field_name").notNull(),
    supertags: text("supertags"), // JSON array of supertag names that use this field
  },
  (table) => ({
    fieldIdIdx: index("idx_field_names_fieldid").on(table.fieldId),
  })
);

// Export type inference for use in queries
export type Node = typeof nodes.$inferSelect;
export type Supertag = typeof supertags.$inferSelect;
export type Field = typeof fields.$inferSelect;
export type Reference = typeof references.$inferSelect;
export type FieldName = typeof fieldNames.$inferSelect;
