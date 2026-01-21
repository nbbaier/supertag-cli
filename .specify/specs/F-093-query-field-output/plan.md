---
feature: "query-field-output"
spec: "./spec.md"
status: "draft"
---

# Technical Plan: Query Field Output

## Architecture Overview

Extend the query pipeline to include field values in output by adding a field resolution layer between query execution and output formatting.

```
Query String → Parser → AST → Query Engine → Field Resolver → Output Formatter
                        ↓           ↓               ↓
                   select: ["*"]   nodes[]    nodes[] + fields{}
                   select: ["a","b"]
```

**Key insight:** The parser already supports `select` clause. We need to:
1. Extend AST handling for `select: "*"` vs `select: ["field1", "field2"]`
2. Add field value retrieval after query execution
3. Update output formatters for dynamic columns

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | PAI standard |
| Runtime | Bun | PAI standard |
| Database | SQLite (bun:sqlite) | Existing infrastructure |
| Field pivot | SQL GROUP BY + CASE | Efficient single-query approach |

## Constitutional Compliance

- [x] **CLI-First:** Query language `select` clause (no new flags)
- [x] **Library-First:** Field resolver as separate module, reusable by MCP
- [x] **Test-First:** TDD with unit tests for field resolution, integration tests for full pipeline
- [x] **Deterministic:** SQL-based field lookup, no AI inference
- [x] **Code Before Prompts:** All logic in TypeScript, no prompts

## Data Model

### Existing Tables Used

```sql
-- Fields defined on a supertag
CREATE TABLE supertag_fields (
  tag_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_order INTEGER DEFAULT 0,
  UNIQUE(tag_id, field_name)
);

-- Supertag inheritance
CREATE TABLE supertag_parents (
  child_tag_id TEXT NOT NULL,
  parent_tag_id TEXT NOT NULL,
  UNIQUE(child_tag_id, parent_tag_id)
);

-- Actual field values
CREATE TABLE field_values (
  parent_id TEXT NOT NULL,      -- node id
  field_name TEXT NOT NULL,
  value_text TEXT NOT NULL,
  value_order INTEGER DEFAULT 0
);
```

### New Types

```typescript
// Extended query result with field data
interface QueryResultWithFields {
  results: NodeWithFields[];
  count: number;
  hasMore: boolean;
  fieldNames: string[];  // Column order for output
}

interface NodeWithFields {
  id: string;
  name: string;
  created: number;
  updated: number | null;
  fields: Record<string, string>;  // field_name → value (comma-joined if multiple)
}

// AST select clause types
type SelectClause = "*" | string[];
```

## API Contracts

### Internal APIs

```typescript
// Field resolver service
class FieldResolver {
  constructor(db: Database) {}

  // Get field names defined on a supertag (including inherited)
  getSupertag Fields(tagName: string): string[];

  // Resolve field values for nodes
  resolveFields(
    nodeIds: string[],
    fieldNames: string[] | "*",
    tagName: string
  ): Map<string, Record<string, string>>;
}

// Updated query command signature
async function executeQueryWithFields(
  ast: QueryAST
): Promise<QueryResultWithFields>;
```

## Implementation Strategy

### Phase 1: Foundation

1. **FieldResolver service** (`src/services/field-resolver.ts`)
   - `getSupertag Fields(tagName)` - lookup fields from `supertag_fields` + inheritance
   - `resolveFields(nodeIds, fieldNames)` - batch fetch from `field_values`

2. **AST type updates** (`src/query/types.ts`)
   - Allow `select: "*"` in addition to `select: string[]`

3. **Parser updates** (`src/query/parser.ts`)
   - Handle `select *` as special token (currently would parse as identifier)

### Phase 2: Core Features

4. **Query engine integration** (`src/query/unified-query-engine.ts`)
   - After executing base query, call FieldResolver for field values
   - Return `QueryResultWithFields`

5. **Output formatting** (`src/commands/query.ts`)
   - Dynamic column headers based on `fieldNames`
   - Include field values in each row

### Phase 3: Integration

6. **All output formats**
   - JSON: Add `fields` object to each result
   - CSV: Dynamic columns with headers
   - Table: Dynamic columns
   - JSONL: Include fields in each line
   - Minimal: Add field keys

7. **MCP tool update** (`src/mcp/tools/query.ts`)
   - Return fields in MCP response

## File Structure

```
src/
├── services/
│   └── field-resolver.ts       # [New] Field lookup service
├── query/
│   ├── types.ts                # [Modified] SelectClause type
│   ├── parser.ts               # [Modified] Handle select *
│   └── unified-query-engine.ts # [Modified] Integrate field resolver
├── commands/
│   └── query.ts                # [Modified] Dynamic output columns
└── mcp/tools/
    └── query.ts                # [Modified] Fields in MCP response

tests/
├── field-resolver.test.ts      # [New] Unit tests
├── query-field-output.test.ts  # [New] Integration tests
└── unified-query-engine.test.ts # [Modified] Add field tests
```

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance with many fields | Medium | Low | Batch field lookup, limit to 50 fields |
| Field name collisions | Low | Low | Use first occurrence, log warning |
| Large multi-value fields | Medium | Medium | Truncate at 500 chars with indicator |

## Failure Mode Analysis

### How This Code Can Fail

| Failure Mode | Trigger | Detection | Degradation | Recovery |
|-------------|---------|-----------|-------------|----------|
| No supertag_fields data | Missing schema sync | Empty field list | Return core fields only | Warn user to re-sync |
| Field values JOIN slow | Large dataset | Query > 5s | Continue anyway | Add LIMIT to field query |
| Unknown field in select | User typo | Field not in results | Silent skip | Log at debug level |

### Assumptions That Could Break

| Assumption | What Would Invalidate It | Detection Strategy |
|-----------|-------------------------|-------------------|
| Field names are consistent | Tana renames field | Field appears empty for old nodes |
| Single inheritance level | Deep inheritance added | Some inherited fields missing |
| value_text is sufficient | Need value_node_id for refs | Wrong output for reference fields |

### Blast Radius

- **Files touched:** ~6 files (3 new, 3 modified)
- **Systems affected:** query command, MCP query tool
- **Rollback strategy:** Revert to previous version, no schema changes

## Dependencies

### External

- None (uses existing bun:sqlite)

### Internal

- `src/query/unified-query-engine.ts` - base query execution
- `src/utils/output-formatter.ts` - output formatting
- `src/config/workspace-resolver.ts` - database access

## Migration/Deployment

- [ ] No database migrations needed (uses existing tables)
- [ ] No new environment variables
- [ ] No breaking changes (additive only)
- [ ] Backward compatible: queries without `select` unchanged

## Estimated Complexity

- **New files:** 2 (field-resolver.ts, field-resolver.test.ts)
- **Modified files:** 4 (types.ts, parser.ts, unified-query-engine.ts, query.ts)
- **Test files:** 2 (new + modified)
- **Estimated tasks:** 8-10
- **Debt score:** 2 (low complexity, well-defined scope)

## Longevity Assessment

### Maintainability Indicators

| Indicator | Status | Notes |
|-----------|--------|-------|
| **Readability:** Can a developer understand this in 6 months? | Yes | Clear separation of concerns |
| **Testability:** Can changes be verified without manual testing? | Yes | Unit + integration tests |
| **Documentation:** Is the "why" captured, not just the "what"? | Yes | Spec documents user needs |

### Evolution Vectors

| What Might Change | Preparation | Impact |
|------------------|-------------|--------|
| More output formats | Formatter abstraction exists | Low |
| Field type coercion | Add optional type handling | Medium |
| Nested field output | Would need new code path | High |

### Deletion Criteria

- [ ] Feature superseded by: Tana native export with fields
- [ ] User need eliminated: External tools handle Tana export
- [ ] Maintenance cost exceeds value when: Field schema changes frequently
