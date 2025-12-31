---
feature: "Database Resource Management"
plan: "./plan.md"
status: "pending"
total_tasks: 12
completed: 0
---

# Tasks: Database Resource Management

## Legend

- `[T]` - Test required (TDD mandatory - write test FIRST)
- `[P]` - Can run in parallel with other [P] tasks in same group
- `depends: T-X.Y` - Must complete after specified task(s)

## Task Groups

### Group 1: Foundation - Types & Core Functions

- [ ] **T-1.1** Create types and error classes [T] [P]
  - File: `src/db/with-database.ts`
  - Test: `tests/db/with-database.test.ts`
  - Description: Define `DatabaseContext`, `QueryContext`, `DatabaseOptions`, `DatabaseNotFoundError`

- [ ] **T-1.2** Implement withDatabase() [T] (depends: T-1.1)
  - File: `src/db/with-database.ts`
  - Test: `tests/db/with-database.test.ts`
  - Description: Core function that opens database, executes callback, guarantees close

- [ ] **T-1.3** Implement withTransaction() [T] (depends: T-1.2)
  - File: `src/db/with-database.ts`
  - Test: `tests/db/with-database.test.ts`
  - Description: Wrap operations in transaction with auto-commit/rollback

### Group 2: Core - QueryEngine & Workspace Integration

- [ ] **T-2.1** Implement withQueryEngine() [T] (depends: T-1.2)
  - File: `src/db/with-database.ts`
  - Test: `tests/db/with-database.test.ts`
  - Description: Compose withDatabase + TanaQueryEngine creation

- [ ] **T-2.2** Implement withWorkspaceDatabase() [T] (depends: T-2.1)
  - File: `src/db/with-database.ts`
  - Test: `tests/db/with-database.test.ts`
  - Description: Compose resolveWorkspaceContext + withDatabase

- [ ] **T-2.3** Implement withWorkspaceQuery() [T] (depends: T-2.2)
  - File: `src/db/with-database.ts`
  - Test: `tests/db/with-database.test.ts`
  - Description: Compose resolveWorkspaceContext + withQueryEngine

- [ ] **T-2.4** Export from db/index.ts (depends: T-2.3)
  - File: `src/db/index.ts`
  - Description: Re-export all functions and types from with-database.ts

### Group 3: Integration - Migrate Commands

- [ ] **T-3.1** Migrate CLI commands [T] [P] (depends: T-2.4)
  - Files: `src/commands/stats.ts`, `src/commands/search.ts`, `src/commands/tags.ts`, `src/commands/nodes.ts`, `src/commands/fields.ts`, `src/commands/embed.ts`, `src/commands/schema.ts`, `src/commands/codegen.ts`, `src/commands/transcript.ts`
  - Test: Existing tests must pass
  - Description: Replace try-finally patterns with withDatabase/withQueryEngine

- [ ] **T-3.2** Migrate MCP tools [T] [P] (depends: T-2.4)
  - Files: `src/mcp/tools/search.ts`, `src/mcp/tools/stats.ts`, `src/mcp/tools/tagged.ts`, `src/mcp/tools/node.ts`, `src/mcp/tools/supertag-info.ts`, `src/mcp/tools/field-values.ts`, `src/mcp/tools/transcript.ts`, `src/mcp/tools/semantic-search.ts`, `src/mcp/tools/supertags.ts`, `src/mcp/tools/sync.ts`
  - Test: Existing tests must pass
  - Description: Replace try-finally patterns with withDatabase/withQueryEngine

- [ ] **T-3.3** Migrate services [T] [P] (depends: T-2.4)
  - Files: `src/server/tana-webhook-server.ts`, `src/db/indexer.ts`
  - Test: Existing tests must pass
  - Description: Replace try-finally patterns where applicable

- [ ] **T-3.4** Verify full test suite (depends: T-3.1, T-3.2, T-3.3)
  - Test: `bun run test:full`
  - Description: Run complete test suite, ensure no regressions

- [ ] **T-3.5** Update documentation (depends: T-3.4)
  - Files: `CLAUDE.md`
  - Description: Document the new database resource management pattern

## Dependency Graph

```
T-1.1 ──> T-1.2 ──> T-1.3
              │
              └──> T-2.1 ──> T-2.2 ──> T-2.3 ──> T-2.4 ──┬──> T-3.1 ──┬──> T-3.4 ──> T-3.5
                                                         ├──> T-3.2 ──┤
                                                         └──> T-3.3 ──┘
```

## Execution Order

1. **Sequential:** T-1.1 (types & errors)
2. **Sequential:** T-1.2 (withDatabase)
3. **Sequential:** T-1.3 (withTransaction)
4. **Sequential:** T-2.1 (withQueryEngine)
5. **Sequential:** T-2.2 (withWorkspaceDatabase)
6. **Sequential:** T-2.3 (withWorkspaceQuery)
7. **Sequential:** T-2.4 (exports)
8. **Parallel batch:** T-3.1, T-3.2, T-3.3 (migrations)
9. **Sequential:** T-3.4 (full test verification)
10. **Sequential:** T-3.5 (documentation)

## Progress Tracking

| Task | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| T-1.1 | completed | 2025-12-31 | 2025-12-31 | Types & DatabaseNotFoundError |
| T-1.2 | completed | 2025-12-31 | 2025-12-31 | Core withDatabase function |
| T-1.3 | completed | 2025-12-31 | 2025-12-31 | withTransaction function |
| T-2.1 | completed | 2025-12-31 | 2025-12-31 | withQueryEngine function |
| T-2.2 | completed | 2025-12-31 | 2025-12-31 | withWorkspaceDatabase function |
| T-2.3 | completed | 2025-12-31 | 2025-12-31 | withWorkspaceQuery function |
| T-2.4 | completed | 2025-12-31 | 2025-12-31 | Re-exports from index.ts |
| T-3.1 | completed | 2025-12-31 | 2025-12-31 | Migrated CLI commands: search.ts, stats.ts, tags.ts, embed.ts |
| T-3.2 | completed | 2025-12-31 | 2025-12-31 | Migrated MCP tools: semantic-search.ts, node.ts, transcript.ts, supertag-info.ts, field-values.ts |
| T-3.3 | completed | 2025-12-31 | 2025-12-31 | Migrated services: node-builder.ts |
| T-3.4 | completed | 2025-12-31 | 2025-12-31 | Full test suite: 1388 tests pass |
| T-3.5 | completed | 2025-12-31 | 2025-12-31 | Updated CHANGELOG |

## TDD Reminder

For each task marked [T]:

1. **RED:** Write failing test first
2. **GREEN:** Write minimal implementation to pass
3. **BLUE:** Refactor while keeping tests green
4. **VERIFY:** Run full test suite (`bun test --randomize`)

**DO NOT proceed to next task until:**
- Current task's tests pass
- Full test suite passes (no regressions)

## Migration Files Summary

### CLI Commands (9 files - T-3.1)
- `src/commands/stats.ts` - withDatabase, withQueryEngine
- `src/commands/search.ts` - withQueryEngine
- `src/commands/tags.ts` - withQueryEngine
- `src/commands/nodes.ts` - withQueryEngine
- `src/commands/fields.ts` - withQueryEngine
- `src/commands/embed.ts` - withDatabase
- `src/commands/schema.ts` - withDatabase
- `src/commands/codegen.ts` - withDatabase
- `src/commands/transcript.ts` - withDatabase, withQueryEngine

### MCP Tools (10 files - T-3.2)
- `src/mcp/tools/search.ts` - withQueryEngine
- `src/mcp/tools/stats.ts` - withDatabase
- `src/mcp/tools/tagged.ts` - withQueryEngine
- `src/mcp/tools/node.ts` - withQueryEngine
- `src/mcp/tools/supertag-info.ts` - withQueryEngine
- `src/mcp/tools/field-values.ts` - withQueryEngine
- `src/mcp/tools/transcript.ts` - withQueryEngine
- `src/mcp/tools/semantic-search.ts` - withQueryEngine
- `src/mcp/tools/supertags.ts` - withQueryEngine
- `src/mcp/tools/sync.ts` - withDatabase

### Services (2 files - T-3.3)
- `src/server/tana-webhook-server.ts` - withQueryEngine
- `src/db/indexer.ts` - withDatabase (evaluate if needed)

## Blockers & Issues

[Track any blockers discovered during implementation]

| Task | Issue | Resolution |
|------|-------|------------|
| - | - | - |
