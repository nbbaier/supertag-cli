---
feature: "Schema Consolidation"
spec: "./spec.md"
status: "draft"
---

# Technical Plan: Schema Consolidation

## Clarifications Resolved

After investigating the codebase:

1. **Color extraction**: Already stored! `node.color` is extracted and stored in `supertags` table (see `src/db/indexer.ts:366`). Color comes from `NodeDump.color` field in Tana exports.

2. **Description extraction**: Available in exports via `props.description` (see `src/types/tana-dump.ts:27`). Currently extracted by SchemaRegistry but NOT stored in database.

3. **Field descriptions**: Available in exports via `fieldDoc.props.description` (see `src/schema/registry.ts:216`). Not stored in database.

4. **Migration strategy**: Re-extract from export during `sync index`. The database tables already have most data - just need to add missing columns.

## Architecture Overview

Consolidate dual schema storage into database-primary with JSON cache generation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                          sync index                                  │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│    ┌─────────────┐  ┌───────────────┐  ┌──────────────┐            │
│    │ supertag_   │  │  supertag_    │  │  supertag_   │            │
│    │ metadata    │  │  fields       │  │  parents     │            │
│    │ (NEW)       │  │  (ENHANCED)   │  │  (existing)  │            │
│    └─────────────┘  └───────────────┘  └──────────────┘            │
│              │               │               │                      │
│              └───────────────┼───────────────┘                      │
│                              ▼                                       │
│                   ┌───────────────────┐                             │
│                   │ UnifiedSchema     │                             │
│                   │ Service           │                             │
│                   └─────────┬─────────┘                             │
│                             │                                        │
│              ┌──────────────┼──────────────┐                        │
│              ▼              ▼              ▼                        │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│    │ schema-     │  │ CLI         │  │ MCP         │               │
│    │ registry.   │  │ commands    │  │ tools       │               │
│    │ json        │  │             │  │             │               │
│    │ (generated) │  │             │  │             │               │
│    └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | PAI standard, existing codebase |
| Runtime | Bun | PAI standard, existing codebase |
| Database | SQLite (bun:sqlite) | Existing, no migration needed |
| ORM | Drizzle | Existing schema definitions |
| Testing | bun:test | Existing test infrastructure |

## Constitutional Compliance

- [x] **CLI-First:** All schema commands already exposed via CLI (`tags`, `schema`)
- [x] **Library-First:** UnifiedSchemaService as reusable module used by CLI, MCP, and node-builder
- [x] **Test-First:** TDD with tests before implementation, 20+ new test cases
- [x] **Deterministic:** Data type inference has deterministic heuristics, no randomness
- [x] **Code Before Prompts:** All logic in TypeScript, no LLM prompts involved

## Data Model

### New Table: supertag_metadata

```sql
CREATE TABLE supertag_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id TEXT NOT NULL UNIQUE,           -- tagDef node ID (same as supertag_fields.tag_id)
  tag_name TEXT NOT NULL,                -- Human-readable name
  normalized_name TEXT NOT NULL,         -- Lowercase, no special chars
  description TEXT,                      -- Optional documentation
  color TEXT,                            -- Hex code or color name
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX idx_supertag_metadata_name ON supertag_metadata(tag_name);
CREATE INDEX idx_supertag_metadata_normalized ON supertag_metadata(normalized_name);
```

### Enhanced Table: supertag_fields

```sql
-- Add columns to existing supertag_fields table
ALTER TABLE supertag_fields ADD COLUMN normalized_name TEXT;
ALTER TABLE supertag_fields ADD COLUMN description TEXT;
ALTER TABLE supertag_fields ADD COLUMN inferred_data_type TEXT;  -- 'text'|'date'|'reference'|'url'|'number'|'checkbox'

CREATE INDEX idx_supertag_fields_normalized ON supertag_fields(normalized_name);
CREATE INDEX idx_supertag_fields_data_type ON supertag_fields(inferred_data_type);
```

### TypeScript Interfaces

```typescript
// New interface for unified schema service
interface UnifiedSupertag {
  id: string;                    // tag_id
  name: string;                  // tag_name
  normalizedName: string;        // normalized_name
  description?: string;
  color?: string;
  fields: UnifiedField[];
  extends?: string[];            // parent tag IDs
}

interface UnifiedField {
  tagId: string;                 // Parent supertag ID
  attributeId: string;           // field_label_id
  name: string;                  // field_name
  normalizedName: string;        // normalized_name
  description?: string;
  dataType?: 'text' | 'date' | 'reference' | 'url' | 'number' | 'checkbox';
  order: number;                 // field_order
}
```

## API Contracts

### UnifiedSchemaService

```typescript
class UnifiedSchemaService {
  constructor(db: Database);

  // Core lookups
  getSupertag(name: string): UnifiedSupertag | null;
  getSupertagById(id: string): UnifiedSupertag | null;
  searchSupertags(query: string): UnifiedSupertag[];
  listSupertags(): UnifiedSupertag[];

  // Field operations (includes inherited)
  getFields(tagId: string): UnifiedField[];
  getAllFields(tagId: string): UnifiedField[];  // With inheritance
  getFieldByNormalizedName(tagId: string, normalizedName: string): UnifiedField | null;

  // Inheritance
  getInheritanceChain(tagId: string): string[];
  getAncestors(tagId: string): Array<{tagId: string, depth: number}>;

  // Data type inference (for create command)
  inferDataType(fieldName: string): 'text' | 'date' | 'reference' | 'url' | 'number' | 'checkbox';

  // Payload building (replaces SchemaRegistry.buildNodePayload)
  buildNodePayload(supertagName: string, nodeName: string, fieldValues: Record<string, any>): TanaApiNode;

  // Cache generation
  generateSchemaCache(outputPath: string): void;
  toSchemaRegistryJSON(): string;
}
```

### Schema Cache Generator

```typescript
// Called at end of sync index
function generateSchemaCacheFromDatabase(db: Database, outputPath: string): void;
```

## Implementation Strategy

### Phase 1: Foundation (Database Schema)

Extend database schema with new table and columns:

- [ ] Create `supertag_metadata` table in `src/db/schema.ts`
- [ ] Add columns to `supertag_fields` table (normalized_name, description, inferred_data_type)
- [ ] Add migration logic in indexer to create tables if not exist
- [ ] Write tests for new schema (table creation, column validation)

### Phase 2: Extraction Enhancement

Update metadata extraction to capture all properties:

- [ ] Enhance `extractSupertagMetadata()` to store normalized_name, description
- [ ] Add data type inference during field extraction
- [ ] Extract and store supertag color in metadata table
- [ ] Extract and store field descriptions
- [ ] Write tests for enhanced extraction (20+ test cases)

### Phase 3: Unified Service

Create service layer that replaces SchemaRegistry usage:

- [ ] Implement `UnifiedSchemaService` class
- [ ] Add normalized name lookup methods
- [ ] Implement `buildNodePayload()` using database data
- [ ] Wire inheritance queries to use recursive CTE
- [ ] Write tests for all service methods

### Phase 4: Cache Generation

Auto-generate schema-registry.json after indexing:

- [ ] Implement `generateSchemaCache()` method
- [ ] Integrate into sync index command (call after indexing)
- [ ] Ensure JSON format matches current SchemaRegistry output
- [ ] Write tests comparing generated cache to SchemaRegistry output

### Phase 5: Integration

Replace SchemaRegistry with UnifiedSchemaService:

- [ ] Update `getSchemaRegistry()` to use UnifiedSchemaService
- [ ] Update `tags show` command to use service
- [ ] Update `schema` commands to use service
- [ ] Update `create` command to use service
- [ ] Update MCP tools to use service
- [ ] Update node-builder service
- [ ] Deprecate direct SchemaRegistry usage (keep for backward compat)

## File Structure

```
src/
├── db/
│   ├── schema.ts                    # [Modified] Add supertag_metadata table
│   └── supertag-metadata.ts         # [Modified] Enhanced extraction
├── services/
│   ├── unified-schema-service.ts    # [New] Database-backed schema service
│   └── supertag-metadata-service.ts # [Modified] Use new schema
├── commands/
│   ├── tags.ts                      # [Modified] Use UnifiedSchemaService
│   ├── schema.ts                    # [Modified] Use UnifiedSchemaService
│   └── sync.ts                      # [Modified] Generate cache after index
├── schema/
│   └── registry.ts                  # [Modified] Wrapper around UnifiedSchemaService
└── index.ts                         # [No change]

tests/
├── db/
│   ├── supertag-metadata-extraction.test.ts  # [Modified] Add new test cases
│   └── unified-schema-service.test.ts        # [New] Service tests
└── integration/
    └── schema-consolidation.test.ts          # [New] End-to-end tests
```

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance regression in create command | High | Medium | Benchmark before/after, add indexes, cache hot paths |
| Breaking existing schema-registry.json consumers | High | Low | Ensure JSON format compatibility, add comparison tests |
| Data type inference differs from SchemaRegistry | Medium | Medium | Use identical heuristics, add comparison tests |
| Migration fails on existing databases | High | Low | Add graceful ALTER TABLE with IF NOT EXISTS |
| Normalized name collisions | Low | Low | Use same normalization function as SchemaRegistry |

## Dependencies

### External

- None new (using existing bun:sqlite, drizzle)

### Internal

- `src/db/schema.ts` - Drizzle schema definitions
- `src/db/supertag-metadata.ts` - Existing extraction logic
- `src/services/supertag-metadata-service.ts` - Existing query service
- `src/schema/registry.ts` - SchemaRegistry for format compatibility

## Migration/Deployment

- [x] Database migrations: Yes (new table, new columns)
- [ ] Environment variables: None new
- [ ] Breaking changes: None (backward compatible JSON cache)

### Migration Strategy

1. On first `sync index` after upgrade:
   - Create `supertag_metadata` table if not exists
   - Add columns to `supertag_fields` if not exists (SQLite ALTER TABLE)
   - Re-extract all metadata from export (populates new columns)
   - Generate schema-registry.json

2. Existing data preserved - only additive changes

## Estimated Complexity

- **New files:** 2 (unified-schema-service.ts, schema-consolidation.test.ts)
- **Modified files:** 7 (schema.ts, supertag-metadata.ts, tags.ts, schema.ts, sync.ts, registry.ts, supertag-metadata-service.ts)
- **Test files:** 2 (1 new, 1 modified)
- **Estimated tasks:** 18-22 tasks across 5 phases
- **New test cases:** 25+
