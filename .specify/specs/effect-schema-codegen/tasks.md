---
feature: "Effect Schema Codegen"
plan: "./plan.md"
status: "pending"
total_tasks: 13
completed: 0
---

# Tasks: Effect Schema Codegen

## Legend

- `[T]` - Test required (TDD mandatory - write test FIRST)
- `[P]` - Can run in parallel with other [P] tasks in same group
- `depends: T-X.Y` - Must complete after specified task(s)

## Task Groups

### Group 1: Foundation

- [x] **T-1.1** Create codegen types [T] [P]
  - File: `src/codegen/types.ts`
  - Test: `tests/codegen/types.test.ts`
  - Description: Define CodegenOptions, CodegenSupertag, CodegenField, GenerationResult interfaces

- [x] **T-1.2** Create naming utilities [T] [P]
  - File: `src/codegen/naming.ts`
  - Test: `tests/codegen/naming.test.ts`
  - Description: Implement toClassName(), toPropertyName(), toValidIdentifier() with reserved word handling

- [x] **T-1.3** Create type mapper [T] [P]
  - File: `src/codegen/type-mapper.ts`
  - Test: `tests/codegen/type-mapper.test.ts`
  - Description: Map DataType → Effect Schema strings for all 8 types + optional wrapping strategies

### Group 2: Core Generator

- [x] **T-2.1** Create Effect class generator [T] (depends: T-1.1, T-1.2, T-1.3)
  - File: `src/codegen/effect-generator.ts`
  - Test: `tests/codegen/effect-generator.test.ts`
  - Description: Generate single Effect Schema class from CodegenSupertag with JSDoc comments

- [x] **T-2.2** Create Effect file generator [T] (depends: T-2.1)
  - File: `src/codegen/effect-generator.ts` (extend)
  - Test: `tests/codegen/effect-generator.test.ts` (extend)
  - Description: Generate complete file with imports, multiple classes, and metadata header

- [x] **T-2.3** Create codegen orchestrator [T] (depends: T-2.2)
  - File: `src/codegen/index.ts`
  - Test: `tests/codegen/index.test.ts`
  - Description: Main generateSchemas() function: load supertags, transform, generate files

- [x] **T-2.4** Add inheritance support [T] (depends: T-2.3)
  - File: `src/codegen/effect-generator.ts` (extend)
  - Test: `tests/codegen/effect-generator.test.ts` (extend)
  - Description: Support Schema.Class.extend() for supertags with parents in same generation

### Group 3: CLI Integration

- [x] **T-3.1** Create codegen CLI command [T] (depends: T-2.3)
  - File: `src/commands/codegen.ts`
  - Test: `tests/codegen/cli.test.ts`
  - Description: Commander.js command with --output, --tags, --format, --optional-strategy, --split flags

- [x] **T-3.2** Wire into main CLI (depends: T-3.1)
  - File: `src/index.ts`
  - Test: n/a (covered by T-3.1 integration test)
  - Description: Register codegen command in main CLI entry point

- [x] **T-3.3** Add multi-file output mode [T] (depends: T-3.2)
  - File: `src/codegen/index.ts` (extend), `src/commands/codegen.ts` (extend)
  - Test: `tests/codegen/cli.test.ts` (extend)
  - Description: Support --split flag for one-file-per-supertag with index.ts re-exports

### Group 4: Polish & Documentation

- [x] **T-4.1** Add TypeScript compilation validation [T] (depends: T-3.3)
  - File: `tests/codegen/compile-check.test.ts`
  - Test: Self-contained test
  - Description: Test that generated code compiles without errors using tsc

- [x] **T-4.2** Update documentation (depends: T-4.1)
  - Files: `README.md`, `CLAUDE.md`, `SKILL.md`
  - Test: n/a
  - Description: Document codegen command, options, and usage examples

- [x] **T-4.3** Update CHANGELOG (depends: T-4.2)
  - File: `CHANGELOG.md`
  - Test: n/a
  - Description: Add codegen feature to [Unreleased] section

## Dependency Graph

```
          ┌───────────────────────────────────────┐
          │         Group 1: Foundation           │
          │  (all parallel - no dependencies)     │
          └───────────────────────────────────────┘
                          │
     ┌────────────────────┼────────────────────┐
     │                    │                    │
     ▼                    ▼                    ▼
  T-1.1               T-1.2               T-1.3
  types               naming            type-mapper
     │                    │                    │
     └────────────────────┼────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────────────┐
          │        Group 2: Core Generator        │
          └───────────────────────────────────────┘
                          │
                          ▼
                       T-2.1
                  effect-generator
                          │
                          ▼
                       T-2.2
                    file-generator
                          │
                          ▼
                       T-2.3
                   orchestrator
                          │
                          ├───────────────────────┐
                          ▼                       │
                       T-2.4                      │
                   inheritance                    │
                          │                       │
          ┌───────────────┴───────────────────────┘
          │
          ▼
┌───────────────────────────────────────┐
│       Group 3: CLI Integration        │
└───────────────────────────────────────┘
          │
          ▼
       T-3.1
     CLI command
          │
          ▼
       T-3.2
     wire to main
          │
          ▼
       T-3.3
    multi-file mode
          │
          ▼
┌───────────────────────────────────────┐
│     Group 4: Polish & Documentation   │
└───────────────────────────────────────┘
          │
          ▼
       T-4.1
   compile validation
          │
          ▼
       T-4.2
    documentation
          │
          ▼
       T-4.3
     changelog
```

## Execution Order

1. **Parallel batch 1:** T-1.1, T-1.2, T-1.3 (Foundation - all independent)
2. **Sequential:** T-2.1 (Effect class generator, needs all foundation)
3. **Sequential:** T-2.2 (File generator, extends T-2.1)
4. **Sequential:** T-2.3 (Orchestrator, needs file generator)
5. **Sequential:** T-2.4 (Inheritance support, extends orchestrator)
6. **Sequential:** T-3.1 (CLI command, needs orchestrator)
7. **Sequential:** T-3.2 (Wire to main CLI)
8. **Sequential:** T-3.3 (Multi-file mode)
9. **Sequential:** T-4.1 (Compile validation)
10. **Sequential:** T-4.2 (Documentation)
11. **Sequential:** T-4.3 (Changelog)

## Progress Tracking

| Task | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| T-1.1 | pending | - | - | Types and interfaces |
| T-1.2 | pending | - | - | Name normalization |
| T-1.3 | pending | - | - | DataType → Effect mapping |
| T-2.1 | pending | - | - | Single class generation |
| T-2.2 | pending | - | - | Full file generation |
| T-2.3 | pending | - | - | Main orchestrator |
| T-2.4 | pending | - | - | Inheritance via .extend() |
| T-3.1 | pending | - | - | Commander.js command |
| T-3.2 | pending | - | - | Register in index.ts |
| T-3.3 | pending | - | - | --split flag support |
| T-4.1 | pending | - | - | TypeScript compile check |
| T-4.2 | pending | - | - | README, CLAUDE.md |
| T-4.3 | pending | - | - | CHANGELOG.md |

## TDD Reminder

For each task marked [T]:

1. **RED:** Write failing test first
2. **GREEN:** Write minimal implementation to pass
3. **BLUE:** Refactor while keeping tests green
4. **VERIFY:** Run full test suite (`bun run test`)

**DO NOT proceed to next task until:**
- Current task's tests pass
- Full test suite passes (no regressions)

## Blockers & Issues

[Track any blockers discovered during implementation]

| Task | Issue | Resolution |
|------|-------|------------|
| - | - | - |

## Notes

- **Reserved words**: T-1.2 must handle JS reserved words (class, function, if, etc.)
- **Edge cases**: Empty supertag names, special characters, numeric prefixes
- **Effect version**: Generated code should work with Effect 3.x
- **Test database**: Tests should use in-memory SQLite with mock supertag data
