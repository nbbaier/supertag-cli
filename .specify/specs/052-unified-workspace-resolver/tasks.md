---
feature: "Unified Workspace Resolver"
plan: "./plan.md"
status: "completed"
total_tasks: 14
completed: 14
---

# Tasks: Unified Workspace Resolver

## Legend

- `[T]` - Test required (TDD mandatory - write test FIRST)
- `[P]` - Can run in parallel with other [P] tasks in same group
- `depends: T-X.Y` - Must complete after specified task(s)

## Task Groups

### Group 1: Foundation - Error Types & Core Interfaces

- [x] **T-1.1** Create error types and interfaces [T]
  - File: `src/config/workspace-resolver.ts`
  - Test: `tests/workspace-resolver.test.ts`
  - Description: Define `WorkspaceNotFoundError`, `WorkspaceDatabaseMissingError`, `ResolvedWorkspace`, and `ResolveOptions` interfaces. Tests verify error message formatting with workspace list and suggested commands.

- [x] **T-1.2** Implement `resolveWorkspaceContext()` [T] (depends: T-1.1)
  - File: `src/config/workspace-resolver.ts`
  - Test: `tests/workspace-resolver.test.ts`
  - Description: Main resolver that wraps existing `resolveWorkspace()`, adds error handling for missing workspaces, and validates database existence when `requireDatabase: true`.

- [x] **T-1.3** Implement caching layer [T] (depends: T-1.2)
  - File: `src/config/workspace-resolver.ts`
  - Test: `tests/workspace-resolver.test.ts`
  - Description: Add `Map<string, ResolvedWorkspace>` cache with `clearWorkspaceCache()`. Tests verify cache hits return same object, cache clear works correctly.

### Group 2: Core - Helper Functions

- [x] **T-2.1** Implement `listAvailableWorkspaces()` [T] [P]
  - File: `src/config/workspace-resolver.ts`
  - Test: `tests/workspace-resolver.test.ts`
  - Description: Returns array of all configured workspace aliases. Used by error messages and workspace list command.

- [x] **T-2.2** Implement `getDefaultWorkspace()` [T] [P]
  - File: `src/config/workspace-resolver.ts`
  - Test: `tests/workspace-resolver.test.ts`
  - Description: Returns default workspace alias from config or 'main' as fallback.

- [x] **T-2.3** Implement `withWorkspace()` [T] (depends: T-1.2)
  - File: `src/config/workspace-resolver.ts`
  - Test: `tests/workspace-resolver.test.ts`
  - Description: Callback wrapper for workspace operations. Resolves workspace context and passes to callback function.

- [x] **T-2.4** Export from config index [P] (depends: T-1.3, T-2.1, T-2.2, T-2.3)
  - File: `src/config/index.ts`
  - Test: N/A (re-export only)
  - Description: Create/update config index to re-export all workspace resolver functions.

### Group 3: Integration - Migrate CLI Commands

- [x] **T-3.1** Update `helpers.ts` to use resolver [T] (depends: T-2.4)
  - File: `src/commands/helpers.ts`
  - Test: `tests/commands-helpers.test.ts`
  - Description: Update `resolveDbPath()` and `checkDb()` to use new resolver internally. Maintain backward compatibility.

- [x] **T-3.2** Migrate search command [T] (depends: T-3.1)
  - File: `src/commands/search.ts`
  - Test: Run existing search tests
  - Description: Replace manual workspace resolution with `resolveWorkspaceContext()`. Verify all search modes still work.

- [x] **T-3.3** Migrate MCP tools [T] [P] (depends: T-3.1)
  - Files: `src/mcp/tools/search.ts`, `src/mcp/tools/create.ts`, `src/mcp/tools/node.ts`, `src/mcp/tools/stats.ts`, `src/mcp/tools/tagged.ts`, `src/mcp/tools/supertags.ts`, `src/mcp/tools/sync.ts`, `src/mcp/tools/field-values.ts`, `src/mcp/tools/supertag-info.ts`, `src/mcp/tools/transcript.ts`, `src/mcp/tools/semantic-search.ts`
  - Test: Run existing MCP tests
  - Description: Replace manual workspace resolution in all MCP tools with `resolveWorkspaceContext()`.

- [x] **T-3.4** Migrate remaining CLI commands [T] [P] (depends: T-3.1)
  - Files: `src/commands/stats.ts`, `src/commands/embed.ts`, `src/commands/show.ts`, `src/commands/fields.ts`, `src/commands/schema.ts`, `src/commands/codegen.ts`, `src/commands/server.ts`, `src/commands/workspace.ts`, `src/commands/sync.ts`, `src/cli/tana-export.ts`
  - Test: Run existing command tests
  - Description: Replace manual workspace resolution with `resolveWorkspaceContext()`.

- [x] **T-3.5** Add cache clear to MCP server (depends: T-3.3)
  - Files: `src/mcp/tools/cache.ts` (new), `src/mcp/index.ts`, `src/mcp/schemas.ts`
  - Test: `src/mcp/tools/__tests__/cache.test.ts`
  - Description: Add `tana_cache_clear` MCP tool exposing `clearWorkspaceCache()`.

### Group 4: Cleanup & Documentation

- [x] **T-4.1** Remove dead code (depends: T-3.2, T-3.3, T-3.4, T-3.5)
  - Files: Various
  - Test: Run full test suite
  - Description: Remove any redundant workspace resolution code after all migrations complete.

- [x] **T-4.2** Update documentation (depends: T-4.1)
  - File: `CLAUDE.md`, `.specify/specs/052-unified-workspace-resolver/tasks.md`
  - Test: N/A
  - Description: Document the new workspace resolution pattern for future development.

## Dependency Graph

```
T-1.1 ──> T-1.2 ──> T-1.3 ──┐
                            │
T-2.1 ─────────────────────┼──> T-2.4 ──> T-3.1 ──┬──> T-3.2 ──┐
T-2.2 ─────────────────────┤                      │            │
                            │                      ├──> T-3.3 ──┼──> T-3.5 ──┐
T-1.2 ──> T-2.3 ───────────┘                      │            │            │
                                                   └──> T-3.4 ──┤            │
                                                                │            │
                                                                └────────────┴──> T-4.1 ──> T-4.2
```

## Execution Order

1. **Sequential:** T-1.1 (error types and interfaces)
2. **Sequential:** T-1.2 (main resolver - depends on T-1.1)
3. **Parallel batch 1:** T-1.3, T-2.1, T-2.2 (can run together after T-1.2)
4. **Sequential:** T-2.3 (depends on T-1.2)
5. **Sequential:** T-2.4 (depends on T-1.3, T-2.1, T-2.2, T-2.3)
6. **Sequential:** T-3.1 (update helpers - gateway to migrations)
7. **Parallel batch 2:** T-3.2, T-3.3, T-3.4 (independent migrations)
8. **Sequential:** T-3.5 (MCP cache clear - depends on T-3.3)
9. **Sequential:** T-4.1 (cleanup - after all migrations)
10. **Sequential:** T-4.2 (documentation - final)

## Progress Tracking

| Task | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| T-1.1 | pending | - | - | Error types, interfaces |
| T-1.2 | pending | - | - | Main resolver |
| T-1.3 | pending | - | - | Caching layer |
| T-2.1 | pending | - | - | listAvailableWorkspaces |
| T-2.2 | pending | - | - | getDefaultWorkspace |
| T-2.3 | pending | - | - | withWorkspace callback |
| T-2.4 | pending | - | - | Config index exports |
| T-3.1 | pending | - | - | Update helpers.ts |
| T-3.2 | pending | - | - | Migrate search |
| T-3.3 | pending | - | - | Migrate MCP tools |
| T-3.4 | pending | - | - | Migrate CLI commands |
| T-3.5 | pending | - | - | MCP cache clear |
| T-4.1 | pending | - | - | Remove dead code |
| T-4.2 | pending | - | - | Update docs |

## TDD Reminder

For each task marked [T]:

1. **RED:** Write failing test first
2. **GREEN:** Write minimal implementation to pass
3. **BLUE:** Refactor while keeping tests green
4. **VERIFY:** Run full test suite (`bun test --randomize`)

**DO NOT proceed to next task until:**
- Current task's tests pass
- Full test suite passes (no regressions)

## Blockers & Issues

[Track any blockers discovered during implementation]

| Task | Issue | Resolution |
|------|-------|------------|
| - | - | - |

## Test File Locations

| Test File | Tasks Covered |
|-----------|---------------|
| `tests/workspace-resolver.test.ts` | T-1.1, T-1.2, T-1.3, T-2.1, T-2.2, T-2.3 |
| `tests/commands-helpers.test.ts` | T-3.1 |
| `tests/mcp-cache.test.ts` | T-3.5 |
| Existing test files | T-3.2, T-3.3, T-3.4 (verify no regressions) |
