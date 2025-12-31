---
feature: "Database Resource Management"
spec: "./spec.md"
status: "draft"
---

# Technical Plan: Database Resource Management

## Architecture Overview

Higher-order functions that wrap database operations with automatic resource cleanup. Composes with the Unified Workspace Resolver (spec 052) to provide a complete solution.

```
┌─────────────────────────────────────────────────────────────┐
│                    Command / MCP Tool                        │
├─────────────────────────────────────────────────────────────┤
│  withWorkspaceQuery({ workspace })                          │
│    ├── resolveWorkspaceContext()  ← from spec 052           │
│    └── withQueryEngine({ dbPath })                          │
│          ├── withDatabase({ dbPath })                       │
│          │     ├── new Database()                           │
│          │     ├── fn(ctx)                                  │
│          │     └── db.close()  ← guaranteed                 │
│          └── new QueryEngine(db)                            │
└─────────────────────────────────────────────────────────────┘
```

### Function Hierarchy

```
withWorkspaceDatabase()  ──┬── resolveWorkspaceContext()
withWorkspaceQuery()    ──┤
                          │
                          └── withDatabase()  ──┬── Database open/close
                              withTransaction() ─┤
                              withQueryEngine() ─┴── QueryEngine creation
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | PAI standard, existing codebase |
| Runtime | Bun | PAI standard, bun:sqlite built-in |
| Database | bun:sqlite | Already in use, synchronous API |
| Pattern | Higher-order functions | Rust-style RAII, compose with async/await |

## Constitutional Compliance

- [x] **CLI-First:** Functions used internally by CLI commands, no new CLI surface
- [x] **Library-First:** Core logic as reusable `src/db/with-database.ts` module
- [x] **Test-First:** TDD with tests for each function, error cases, cleanup verification
- [x] **Deterministic:** Pure wrapper functions, no probabilistic behavior
- [x] **Code Before Prompts:** All logic in TypeScript, no prompts involved

## Data Model

### Types (New)

```typescript
// Context passed to callback functions
interface DatabaseContext {
  db: Database;
  dbPath: string;
}

interface QueryContext extends DatabaseContext {
  engine: TanaQueryEngine;
}

// Options for database operations
interface DatabaseOptions {
  dbPath: string;
  readonly?: boolean;
  requireExists?: boolean;  // default: true
}
```

### Error Types (New)

```typescript
// Replaces ad-hoc "Database not found" errors
class DatabaseNotFoundError extends Error {
  constructor(dbPath: string);
  dbPath: string;
}
```

## API Contracts

### Core Functions

```typescript
// Execute with auto-closing database
function withDatabase<T>(
  options: DatabaseOptions,
  fn: (ctx: DatabaseContext) => T | Promise<T>
): Promise<T>;

// Execute with database + QueryEngine
function withQueryEngine<T>(
  options: DatabaseOptions,
  fn: (ctx: QueryContext) => T | Promise<T>
): Promise<T>;

// Execute within transaction (auto-commit/rollback)
function withTransaction<T>(
  options: DatabaseOptions,
  fn: (ctx: DatabaseContext) => T | Promise<T>
): Promise<T>;
```

### Workspace Composition Functions

```typescript
// Resolve workspace + open database
function withWorkspaceDatabase<T>(
  options: { workspace?: string; readonly?: boolean },
  fn: (ctx: DatabaseContext & { workspace: ResolvedWorkspace }) => T | Promise<T>
): Promise<T>;

// Resolve workspace + open database + create QueryEngine
function withWorkspaceQuery<T>(
  options: { workspace?: string },
  fn: (ctx: QueryContext & { workspace: ResolvedWorkspace }) => T | Promise<T>
): Promise<T>;
```

## Implementation Strategy

### Phase 1: Foundation - Core Functions & Types

Build the base module with core functionality:

1. Create `src/db/with-database.ts`
2. Implement `DatabaseNotFoundError` error class
3. Implement `withDatabase()` with tests
4. Implement `withTransaction()` with tests

### Phase 2: Core - Query Engine & Workspace Integration

Add QueryEngine support and workspace composition:

1. Implement `withQueryEngine()` with tests
2. Implement `withWorkspaceDatabase()` with tests
3. Implement `withWorkspaceQuery()` with tests
4. Export from `src/db/index.ts`

### Phase 3: Integration - Migrate Commands

Migrate existing code to use new functions:

1. Migrate CLI commands (search, stats, tags, nodes, etc.)
2. Migrate MCP tools (search, stats, tagged, etc.)
3. Migrate services as needed
4. Remove redundant try-finally blocks
5. Verify all tests pass

## File Structure

```
src/
├── db/
│   ├── index.ts                    # [Modified] Add exports
│   └── with-database.ts            # [New] Core functions
├── config/
│   └── workspace-resolver.ts       # [Existing] Used by composition
├── commands/
│   ├── search.ts                   # [Modified] Use withQueryEngine
│   ├── stats.ts                    # [Modified] Use withDatabase
│   ├── tags.ts                     # [Modified] Use withQueryEngine
│   ├── nodes.ts                    # [Modified] Use withQueryEngine
│   ├── schema.ts                   # [Modified] Use withDatabase
│   ├── embed.ts                    # [Modified] Use withDatabase
│   └── fields.ts                   # [Modified] Use withQueryEngine
└── mcp/tools/
    ├── search.ts                   # [Modified] Use withQueryEngine
    ├── stats.ts                    # [Modified] Use withDatabase
    ├── tagged.ts                   # [Modified] Use withQueryEngine
    └── node.ts                     # [Modified] Use withQueryEngine

tests/
└── db/
    └── with-database.test.ts       # [New] Unit tests
```

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| QueryEngine close() needed | Medium | Low | Verify TanaQueryEngine has no cleanup; wrap if needed |
| Async callback edge cases | Medium | Low | Test both sync and async callbacks thoroughly |
| Breaking existing tests | Low | Medium | Run full test suite after each migration |
| Missing migration targets | Low | Medium | Grep for `new Database` and `db.close()` patterns |

## Dependencies

### External

- None new (uses existing bun:sqlite)

### Internal

- `src/config/workspace-resolver.ts` - For `withWorkspaceDatabase/Query` composition
- `src/query/tana-query-engine.ts` - For `withQueryEngine` wrapper

## Migration/Deployment

- [ ] **Database migrations:** None required
- [ ] **Environment variables:** None required
- [ ] **Breaking changes:** None - internal refactoring only

### Migration Pattern

```typescript
// BEFORE
const db = new Database(dbPath);
try {
  const engine = new TanaQueryEngine(db);
  // ... operations
  return result;
} finally {
  db.close();
}

// AFTER
return withQueryEngine({ dbPath }, (ctx) => {
  // ... operations using ctx.engine
  return result;
});
```

## Estimated Complexity

- **New files:** 1 (`with-database.ts`)
- **Modified files:** ~15 (commands, MCP tools)
- **Test files:** 1 (`with-database.test.ts`)
- **Estimated tasks:** ~10
- **Lines saved:** ~180 (boilerplate try-finally removal)

## TDD Test Strategy

### Test Categories

1. **withDatabase tests:**
   - Execute function and close database
   - Close database even on error
   - Throw DatabaseNotFoundError for missing file
   - Allow missing database when requireExists=false
   - Support readonly mode

2. **withTransaction tests:**
   - Commit on success
   - Rollback on error
   - Handle nested operations

3. **withQueryEngine tests:**
   - Provide both db and engine in context
   - Close database after callback completes

4. **withWorkspaceQuery tests:**
   - Resolve workspace and open database
   - Pass workspace in context
   - Handle workspace not found errors

### Test Isolation

Each test creates its own temporary database to avoid interference.
