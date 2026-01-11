---
feature: "TUI Todo App"
plan: "./plan.md"
status: "pending"
total_tasks: 14
completed: 0
---

# Tasks: TUI Todo App

## Legend

- `[T]` - Test required (TDD mandatory - write test FIRST)
- `[P]` - Can run in parallel with other [P] tasks in same group
- `depends: T-X.Y` - Must complete after specified task(s)

## Task Groups

### Group 1: Foundation

- [x] **T-1.1** Create project structure [P]
  - Files: `examples/tui-todo/package.json`, `tsconfig.json`
  - Description: Initialize example project with Ink, React, Effect dependencies

- [x] **T-1.2** Generate Todo schema [P]
  - File: `examples/tui-todo/src/schemas.ts`
  - Description: Run `supertag codegen generate -o ./src/schemas.ts --tags Todo`

- [x] **T-1.3** Implement TodoService [T] (depends: T-1.1, T-1.2)
  - File: `examples/tui-todo/src/services/todo-service.ts`
  - Test: `examples/tui-todo/tests/todo-service.test.ts`
  - Description: Read todos from supertag-cli SQLite database

- [x] **T-1.4** Implement TanaInputApi [T] (depends: T-1.1, T-1.2)
  - File: `examples/tui-todo/src/services/tana-api.ts`
  - Test: `examples/tui-todo/tests/tana-api.test.ts`
  - Description: Create todos via Tana Input API

- [x] **T-1.5** Create app state types
  - File: `examples/tui-todo/src/types/app-state.ts`
  - Description: Define AppState, AppAction types for state management

### Group 2: Core UI

- [x] **T-2.1** Implement App component with state (depends: T-1.3, T-1.4, T-1.5)
  - File: `examples/tui-todo/src/components/App.tsx`
  - Description: Main component with useReducer, keyboard handling, mode switching

- [x] **T-2.2** Implement TodoList component [P] (depends: T-2.1)
  - File: `examples/tui-todo/src/components/TodoList.tsx`
  - Description: Left pane showing todo list with selection, strikethrough for completed

- [x] **T-2.3** Implement TodoDetail component [P] (depends: T-2.1)
  - File: `examples/tui-todo/src/components/TodoDetail.tsx`
  - Description: Right pane showing all fields of selected todo

- [x] **T-2.4** Implement CreateForm component [T] (depends: T-2.1)
  - File: `examples/tui-todo/src/components/CreateForm.tsx`
  - Description: Form with text inputs, Effect schema validation, submit/cancel

- [x] **T-2.5** Implement StatusBar component [P] (depends: T-2.1)
  - File: `examples/tui-todo/src/components/StatusBar.tsx`
  - Description: Bottom bar showing keyboard shortcuts, current mode, error messages

- [x] **T-2.6** Add filter/search functionality (depends: T-2.2)
  - File: `examples/tui-todo/src/components/FilterInput.tsx`
  - Description: Text input for filtering todos by title, integrates with TodoList

### Group 3: Integration

- [x] **T-3.1** Implement HelpOverlay component (depends: T-2.5)
  - File: `examples/tui-todo/src/components/HelpOverlay.tsx`
  - Description: Full-screen help overlay with all keyboard shortcuts

- [x] **T-3.2** Create entry point and wire everything (depends: T-2.1, T-2.2, T-2.3, T-2.4, T-2.5)
  - File: `examples/tui-todo/src/index.tsx`
  - Description: Main entry point, render App with Ink

- [x] **T-3.3** Write example README (depends: T-3.2)
  - File: `examples/tui-todo/README.md`
  - Description: Usage instructions, screenshots, setup steps

- [x] **T-3.4** Update main README (depends: T-3.3)
  - File: `README.md`
  - Description: Add reference to tui-todo example in supertag-cli docs

## Dependency Graph

```
T-1.1 ──┬──> T-1.3 ──┬──> T-2.1 ──┬──> T-2.2 ──> T-2.6
        │           │           │
T-1.2 ──┤           │           ├──> T-2.3
        │           │           │
        └──> T-1.4 ─┘           ├──> T-2.4
                                │
T-1.5 ──────────────────────────┤
                                │
                                └──> T-2.5 ──> T-3.1
                                        │
                                        └──────────────> T-3.2 ──> T-3.3 ──> T-3.4
```

## Execution Order

1. **Parallel batch 1:** T-1.1, T-1.2
2. **Parallel batch 2:** T-1.3, T-1.4, T-1.5 (after batch 1)
3. **Sequential:** T-2.1 (after batch 2)
4. **Parallel batch 3:** T-2.2, T-2.3, T-2.4, T-2.5 (after T-2.1)
5. **Sequential:** T-2.6 (after T-2.2)
6. **Sequential:** T-3.1 (after T-2.5)
7. **Sequential:** T-3.2 (after all T-2.x complete)
8. **Sequential:** T-3.3, T-3.4 (documentation)

## Progress Tracking

| Task | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| T-1.1 | pending | - | - | |
| T-1.2 | pending | - | - | |
| T-1.3 | pending | - | - | |
| T-1.4 | pending | - | - | |
| T-1.5 | pending | - | - | |
| T-2.1 | pending | - | - | |
| T-2.2 | pending | - | - | |
| T-2.3 | pending | - | - | |
| T-2.4 | pending | - | - | |
| T-2.5 | pending | - | - | |
| T-2.6 | pending | - | - | |
| T-3.1 | pending | - | - | |
| T-3.2 | pending | - | - | |
| T-3.3 | pending | - | - | |
| T-3.4 | pending | - | - | |

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
