---
feature: "Schema Consolidation"
plan: "./plan.md"
status: "completed"
total_tasks: 19
completed: 19
---

# Tasks: Schema Consolidation

## Legend

- `[T]` - Test required (TDD mandatory - write test FIRST)
- `[P]` - Can run in parallel with other [P] tasks in same group
- `depends: T-X.Y` - Must complete after specified task(s)

## Task Groups

### Group 1: Foundation (Database Schema)

- [ ] **T-1.1** Add supertag_metadata table [T] [P]
  - File: `src/db/schema.ts`
  - Test: `tests/db/supertag-metadata-table.test.ts`
  - Description: Create new Drizzle table for supertag-level metadata (normalized_name, description, color)

- [ ] **T-1.2** Enhance supertag_fields columns [T] [P]
  - File: `src/db/schema.ts`
  - Test: `tests/db/supertag-fields-enhanced.test.ts`
  - Description: Add normalized_name, description, inferred_data_type columns to supertag_fields

- [ ] **T-1.3** Add migration logic for new columns [T] (depends: T-1.1, T-1.2)
  - File: `src/db/indexer.ts`
  - Test: `tests/db/schema-migration.test.ts`
  - Description: ALTER TABLE logic with IF NOT EXISTS for graceful upgrades

### Group 2: Extraction Enhancement

- [ ] **T-2.1** Implement normalizeName function [T] [P]
  - File: `src/utils/normalize-name.ts`
  - Test: `tests/utils/normalize-name.test.ts`
  - Description: Extract normalization from SchemaRegistry to reusable utility

- [ ] **T-2.2** Implement inferDataType function [T] [P]
  - File: `src/utils/infer-data-type.ts`
  - Test: `tests/utils/infer-data-type.test.ts`
  - Description: Extract data type inference from SchemaRegistry to reusable utility

- [ ] **T-2.3** Enhance extractFieldsFromTagDef [T] (depends: T-2.1, T-2.2)
  - File: `src/db/supertag-metadata.ts`
  - Test: `tests/db/supertag-metadata-extraction.test.ts`
  - Description: Store normalized_name, description, inferred_data_type during extraction

- [ ] **T-2.4** Add supertag metadata extraction [T] (depends: T-1.3, T-2.1)
  - File: `src/db/supertag-metadata.ts`
  - Test: `tests/db/supertag-metadata-extraction.test.ts`
  - Description: Extract and store tag name, description, color in supertag_metadata table

### Group 3: Unified Schema Service

- [ ] **T-3.1** Create UnifiedSchemaService class [T] (depends: T-2.3, T-2.4)
  - File: `src/services/unified-schema-service.ts`
  - Test: `tests/services/unified-schema-service.test.ts`
  - Description: Core service class with constructor and basic queries

- [ ] **T-3.2** Implement supertag lookups [T] (depends: T-3.1)
  - File: `src/services/unified-schema-service.ts`
  - Test: `tests/services/unified-schema-service.test.ts`
  - Description: getSupertag, getSupertagById, searchSupertags, listSupertags methods

- [ ] **T-3.3** Implement field operations [T] (depends: T-3.1)
  - File: `src/services/unified-schema-service.ts`
  - Test: `tests/services/unified-schema-service.test.ts`
  - Description: getFields, getAllFields (with inheritance), getFieldByNormalizedName

- [ ] **T-3.4** Implement buildNodePayload [T] (depends: T-3.2, T-3.3)
  - File: `src/services/unified-schema-service.ts`
  - Test: `tests/services/unified-schema-service.test.ts`
  - Description: Replicate SchemaRegistry.buildNodePayload using database data

### Group 4: Cache Generation

- [ ] **T-4.1** Implement toSchemaRegistryJSON [T] (depends: T-3.2, T-3.3)
  - File: `src/services/unified-schema-service.ts`
  - Test: `tests/services/unified-schema-service.test.ts`
  - Description: Generate JSON in exact SchemaRegistry format

- [ ] **T-4.2** Implement generateSchemaCache [T] (depends: T-4.1)
  - File: `src/services/unified-schema-service.ts`
  - Test: `tests/services/schema-cache-generation.test.ts`
  - Description: Write JSON to file, called after sync index

- [ ] **T-4.3** Integrate cache generation into sync index [T] (depends: T-4.2)
  - File: `src/commands/sync.ts`
  - Test: `tests/commands/sync-schema-cache.test.ts`
  - Description: Call generateSchemaCache after indexing completes

### Group 5: Integration

- [ ] **T-5.1** Update getSchemaRegistry wrapper [T] (depends: T-3.4, T-4.2)
  - File: `src/commands/schema.ts`
  - Test: `tests/commands/schema.test.ts`
  - Description: Load from generated cache OR fallback to database

- [ ] **T-5.2** Update tags show command [T] (depends: T-5.1)
  - File: `src/commands/tags.ts`
  - Test: `tests/commands/tags.test.ts`
  - Description: Use UnifiedSchemaService for display, show inferred types

- [ ] **T-5.3** Update create command [T] (depends: T-5.1)
  - File: `src/commands/create.ts`
  - Test: `tests/commands/create.test.ts`
  - Description: Use UnifiedSchemaService.buildNodePayload

- [ ] **T-5.4** Update MCP supertag_info tool [T] (depends: T-5.1)
  - File: `src/mcp/tools/supertag-info.ts`
  - Test: `tests/mcp/supertag-info.test.ts`
  - Description: Return inferred data types in field info

- [ ] **T-5.5** Final validation and cleanup
  - Files: Multiple
  - Test: Run full test suite
  - Description: Ensure all 782+ tests pass, remove deprecated code paths

## Dependency Graph

```
                    ┌──────────────────────────────────────────────────────┐
                    │               GROUP 1: Foundation                     │
                    │                                                       │
                    │   T-1.1 ──┬──> T-1.3                                 │
                    │   T-1.2 ──┘      │                                   │
                    └─────────────────┼────────────────────────────────────┘
                                      │
                    ┌─────────────────┼────────────────────────────────────┐
                    │           GROUP 2: Extraction                         │
                    │                 │                                     │
                    │   T-2.1 ──┬─────┼──> T-2.3                           │
                    │   T-2.2 ──┘     │       │                            │
                    │                 └─> T-2.4                            │
                    │                       │                              │
                    └───────────────────────┼──────────────────────────────┘
                                            │
                    ┌───────────────────────┼──────────────────────────────┐
                    │           GROUP 3: Unified Service                    │
                    │                       │                              │
                    │                    T-3.1                             │
                    │                    /    \                            │
                    │                 T-3.2  T-3.3                         │
                    │                    \    /                            │
                    │                    T-3.4                             │
                    │                       │                              │
                    └───────────────────────┼──────────────────────────────┘
                                            │
                    ┌───────────────────────┼──────────────────────────────┐
                    │          GROUP 4: Cache Generation                    │
                    │                       │                              │
                    │                    T-4.1                             │
                    │                       │                              │
                    │                    T-4.2                             │
                    │                       │                              │
                    │                    T-4.3                             │
                    │                       │                              │
                    └───────────────────────┼──────────────────────────────┘
                                            │
                    ┌───────────────────────┼──────────────────────────────┐
                    │           GROUP 5: Integration                        │
                    │                       │                              │
                    │                    T-5.1                             │
                    │                   /  |  \                            │
                    │              T-5.2 T-5.3 T-5.4                       │
                    │                   \  |  /                            │
                    │                    T-5.5                             │
                    │                                                       │
                    └───────────────────────────────────────────────────────┘
```

## Execution Order

1. **Parallel batch 1:** T-1.1, T-1.2, T-2.1, T-2.2
2. **Sequential:** T-1.3 (after T-1.1, T-1.2)
3. **Parallel batch 2:** T-2.3, T-2.4 (after batch 1 + T-1.3)
4. **Sequential:** T-3.1 (after T-2.3, T-2.4)
5. **Parallel batch 3:** T-3.2, T-3.3 (after T-3.1)
6. **Sequential:** T-3.4 (after T-3.2, T-3.3)
7. **Sequential:** T-4.1 (after T-3.2, T-3.3)
8. **Sequential:** T-4.2 (after T-4.1)
9. **Sequential:** T-4.3 (after T-4.2)
10. **Sequential:** T-5.1 (after T-3.4, T-4.2)
11. **Parallel batch 4:** T-5.2, T-5.3, T-5.4 (after T-5.1)
12. **Sequential:** T-5.5 (after all tasks)

## Progress Tracking

| Task | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| T-1.1 | done | 2025-12-23 | 2025-12-23 | Added supertagMetadata table to schema.ts |
| T-1.2 | done | 2025-12-23 | 2025-12-23 | Added normalizedName, description, inferredDataType to supertagFields |
| T-1.3 | done | 2025-12-23 | 2025-12-23 | Added migrateSchemaConsolidation() to migrate.ts |
| T-2.1 | done | 2025-12-23 | 2025-12-23 | Created src/utils/normalize-name.ts |
| T-2.2 | done | 2025-12-23 | 2025-12-23 | Created src/utils/infer-data-type.ts |
| T-2.3 | done | 2025-12-23 | 2025-12-23 | Added extractEnhancedFieldsFromTagDef with normalizedName, inferredDataType |
| T-2.4 | done | 2025-12-23 | 2025-12-23 | Added extractSupertagMetadataEntry for supertag_metadata table |
| T-3.1 | done | 2025-12-23 | 2025-12-23 | Created UnifiedSchemaService with constructor, getSupertag, getSupertagById, listSupertags, searchSupertags, getStats |
| T-3.2 | done | 2025-12-23 | 2025-12-23 | Implemented as part of T-3.1: all lookup methods included |
| T-3.3 | done | 2025-12-23 | 2025-12-23 | Implemented getFields, getAllFields (with inheritance), getFieldByNormalizedName |
| T-3.4 | done | 2025-12-23 | 2025-12-23 | Implemented buildNodePayload with field matching, data types, multiple supertags |
| T-4.1 | done | 2025-12-23 | 2025-12-23 | Implemented toSchemaRegistryJSON with backward-compatible format |
| T-4.2 | done | 2025-12-23 | 2025-12-23 | Implemented generateSchemaCache with directory creation |
| T-4.3 | done | 2025-12-23 | 2025-12-23 | Added schemaCachePath to TanaExportWatcher, generates cache after index |
| T-5.1 | done | 2025-12-23 | 2025-12-23 | Added getSchemaRegistryFromDatabase function with 6 tests |
| T-5.2 | done | 2025-12-23 | 2025-12-23 | Added getTagDetailsFromDatabase with inferred types, 5 tests |
| T-5.3 | done | 2025-12-23 | 2025-12-23 | Added buildNodePayloadFromDatabase function, 6 tests |
| T-5.4 | done | 2025-12-23 | 2025-12-23 | Added inferredDataType to FieldInfo, updated SupertagMetadataService |
| T-5.5 | done | 2025-12-24 | 2025-12-24 | All 940 tests pass, binary builds successfully |

## TDD Reminder

For each task marked [T]:

1. **RED:** Write failing test first
2. **GREEN:** Write minimal implementation to pass
3. **BLUE:** Refactor while keeping tests green
4. **VERIFY:** Run full test suite (`bun test`)

**DO NOT proceed to next task until:**
- Current task's tests pass
- Full test suite passes (no regressions)

## Blockers & Issues

[Track any blockers discovered during implementation]

| Task | Issue | Resolution |
|------|-------|------------|
| - | - | - |
