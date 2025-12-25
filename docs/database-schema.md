# Database Schema

Technical reference for the SQLite database structure used by Supertag CLI.

## Overview

Supertag uses a **hybrid storage approach**:

- **Normalized SQL tables** for queryable metadata (fast queries, indexes)
- **JSON storage** for complete node data (flexibility, future-proofing)
- **FTS5 virtual tables** for full-text search

This design enables fast queries on common fields while preserving access to the complete Tana node structure.

---

## Database Location

```
~/.local/share/supertag/workspaces/{alias}/tana-index.db
```

Default workspace is `main`:
```
~/.local/share/supertag/workspaces/main/tana-index.db
```

---

## Core Tables

### nodes

All Tana nodes with extracted metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Tana node ID |
| `name` | TEXT | Node name/content |
| `parent_id` | TEXT | Parent node ID |
| `node_type` | TEXT | `'node'`, `'supertag'`, `'field'`, `'trash'` |
| `created` | INTEGER | Unix timestamp |
| `updated` | INTEGER | Unix timestamp |
| `done_at` | INTEGER | Completion timestamp (from `props._done`) |
| `raw_data` | TEXT | **Complete NodeDump as JSON** |

**Indexes**: `parent_id`, `node_type`, `name`, `done_at`

### tag_applications

Maps nodes to their applied supertags. Essential for "find by tag" queries.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `tuple_node_id` | TEXT | The tuple node containing the tag |
| `data_node_id` | TEXT | The node the tag is applied to |
| `tag_id` | TEXT | Supertag definition ID |
| `tag_name` | TEXT | Human-readable tag name |

**Indexes**: `data_node_id`, `tag_id`, `tag_name`

### supertags

Detected supertag definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `node_id` | TEXT | Node ID of the supertag definition |
| `tag_name` | TEXT | Supertag name |
| `tag_id` | TEXT | Unique tag identifier |
| `color` | TEXT | Tag color (hex or name) |

**Indexes**: `node_id`, `tag_name`, `tag_id`

### references

Node relationships (inline references, parent-child links).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `from_node` | TEXT | Source node ID |
| `to_node` | TEXT | Target node ID |
| `reference_type` | TEXT | `'inline_ref'`, `'parent'`, `'child'` |

**Indexes**: `from_node`, `to_node`, `reference_type`

---

## Field Tables

### fields

Field definitions extracted from nodes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `node_id` | TEXT | Node containing the field |
| `field_name` | TEXT | Field label |
| `field_id` | TEXT | Field definition ID |

**Indexes**: `node_id`, `field_name`, `field_id`

### field_names

Maps field IDs to human-readable names across supertags.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `field_id` | TEXT UNIQUE | Field definition ID |
| `field_name` | TEXT | Human-readable name |
| `supertags` | TEXT | **JSON array of supertag names** |

**Indexes**: `field_id`

### field_values

Extracted text-based field values from tuple children.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `tuple_id` | TEXT | Tuple node containing field |
| `parent_id` | TEXT | Parent node the field belongs to |
| `field_def_id` | TEXT | Field definition ID (`_sourceId`) |
| `field_name` | TEXT | Human-readable field name |
| `value_node_id` | TEXT | Node containing the value text |
| `value_text` | TEXT | Actual text content |
| `value_order` | INTEGER | Order for multi-value fields |
| `created` | INTEGER | Timestamp from parent node |

**Indexes**: `parent_id`, `field_name`, `field_def_id`, `created`

### field_exclusions

Fields to skip during indexing (e.g., system fields).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `field_name` | TEXT UNIQUE | Field name to exclude |
| `reason` | TEXT | Why it's excluded |

---

## Supertag Metadata Tables

### supertag_fields

Field definitions for each supertag, extracted from `tagDef` tuples.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `tag_id` | TEXT | tagDef node ID |
| `tag_name` | TEXT | Human-readable tag name |
| `field_name` | TEXT | Field label |
| `field_label_id` | TEXT | Node ID of the field label |
| `field_order` | INTEGER | Position in tagDef children |
| `normalized_name` | TEXT | Lowercase, no special chars |
| `description` | TEXT | Field documentation |
| `inferred_data_type` | TEXT | `'text'`, `'date'`, `'reference'`, `'url'`, `'number'`, `'checkbox'` |

**Indexes**: `tag_id`, `tag_name`, `(tag_id, field_name)` unique, `normalized_name`, `inferred_data_type`

### supertag_parents

Supertag inheritance relationships, extracted from `metaNode` `SYS_A13` tuples.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `child_tag_id` | TEXT | Child tagDef node ID |
| `parent_tag_id` | TEXT | Parent tagDef node ID |

**Indexes**: `child_tag_id`, `parent_tag_id`, `(child_tag_id, parent_tag_id)` unique

### supertag_metadata

Supertag-level properties.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `tag_id` | TEXT UNIQUE | tagDef node ID |
| `tag_name` | TEXT | Human-readable name |
| `normalized_name` | TEXT | Lowercase, no special chars |
| `description` | TEXT | Optional documentation |
| `color` | TEXT | Hex code or color name |
| `created_at` | INTEGER | Unix timestamp |

**Indexes**: `tag_name`, `normalized_name`

---

## Virtual Tables (FTS5)

### nodes_fts

Full-text search on node names.

```sql
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  name,
  content='nodes',
  content_rowid='rowid',
  tokenize='porter unicode61'
)
```

### field_values_fts

Full-text search on field values.

```sql
CREATE VIRTUAL TABLE field_values_fts USING fts5(
  field_name,
  value_text,
  content='field_values',
  content_rowid='id',
  tokenize='porter unicode61'
)
```

Automatically synchronized via triggers (`field_values_ai`, `field_values_ad`, `field_values_au`).

---

## System Tables

### sync_metadata

Tracks sync state for incremental updates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Always 1 |
| `last_sync` | TEXT | ISO timestamp of last sync |
| `node_count` | INTEGER | Total nodes indexed |
| `export_file` | TEXT | Path to last export file |

### node_checksums

Content hashes for change detection during sync.

| Column | Type | Description |
|--------|------|-------------|
| `node_id` | TEXT PRIMARY KEY | Tana node ID |
| `checksum` | TEXT | Content hash |

---

## JSON Storage Details

### nodes.raw_data

Stores the complete `NodeDump` object from Tana export:

```typescript
interface NodeDump {
  id: string;
  props: {
    name?: TextRun[];
    _ownerId?: string;
    created?: number;
    _flags?: number;        // Entity detection
    _done?: number;         // Completion timestamp
    _sourceId?: string;     // Field definition reference
    docType?: string;       // 'tuple', 'node', 'metaNode', etc.
    // ... other props preserved via .passthrough()
  };
}
```

**Use cases:**
- Access to `props` not in normalized columns
- Future-proofing for new Tana features
- Detailed node inspection

**Querying JSON:**
```sql
SELECT id, json_extract(raw_data, '$.props._flags') as flags
FROM nodes
WHERE json_extract(raw_data, '$.props.docType') = 'tagDef'
```

### field_names.supertags

JSON array of supertag names that use this field:

```json
["meeting", "project", "task"]
```

---

## Common Query Patterns

### Find nodes by supertag

```sql
SELECT n.id, n.name, ta.tag_name
FROM nodes n
INNER JOIN tag_applications ta ON ta.data_node_id = n.id
WHERE ta.tag_name = 'meeting'
```

### Full-text search

```sql
SELECT n.id, n.name, rank
FROM nodes n
INNER JOIN nodes_fts ON nodes_fts.rowid = n.rowid
WHERE nodes_fts MATCH 'project*'
ORDER BY rank
```

### Find field values for a node

```sql
SELECT field_name, value_text, value_order
FROM field_values
WHERE parent_id = ?
ORDER BY field_name, value_order
```

### Supertag inheritance chain

```sql
WITH RECURSIVE ancestors AS (
  SELECT child_tag_id, parent_tag_id, 1 as depth
  FROM supertag_parents
  WHERE child_tag_id = ?
  UNION ALL
  SELECT sp.child_tag_id, sp.parent_tag_id, a.depth + 1
  FROM supertag_parents sp
  INNER JOIN ancestors a ON sp.child_tag_id = a.parent_tag_id
)
SELECT * FROM ancestors
```

---

## Embeddings Storage

Vector embeddings are stored separately using [resona](https://github.com/jcfischer/resona) with LanceDB:

```
~/.local/share/supertag/workspaces/{alias}/embeddings.lance/
```

This is a columnar database optimized for vector similarity search, not part of the SQLite schema.

---

## Source Files

| File | Description |
|------|-------------|
| `src/db/schema.ts` | Drizzle ORM schema definitions |
| `src/db/migrate.ts` | Migration functions for schema updates |
| `src/db/indexer.ts` | Indexing logic and table creation |
| `src/db/field-values.ts` | Field value extraction |
| `src/db/entity.ts` | Entity detection using `_flags` |
