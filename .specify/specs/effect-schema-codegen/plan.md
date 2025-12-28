---
feature: "Effect Schema Codegen"
spec: "./spec.md"
status: "draft"
---

# Technical Plan: Effect Schema Codegen

## Architecture Overview

Generate Effect Schema class definitions from Tana supertag metadata. The system reads from the existing `UnifiedSchemaService` (database-backed), maps Tana DataTypes to Effect Schema types, and outputs valid TypeScript.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLI Layer                                      │
│  supertag codegen --output ./generated/ --tags "Todo,Person"            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CodegenService                                    │
│  • Orchestrates the generation pipeline                                  │
│  • Handles CLI options (format, naming, optional-strategy)              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ UnifiedSchema   │   │   TypeMapper    │   │  EffectGenerator│
│   Service       │   │                 │   │                 │
│ (existing)      │   │ DataType →      │   │ Template-based  │
│                 │   │ Effect Schema   │   │ code generation │
│ • listSupertags │   │ type mapping    │   │                 │
│ • getAllFields  │   │                 │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Output                                         │
│  • Single file: ./generated/schemas.ts                                   │
│  • Multi file:  ./generated/{TodoItem,Person,...}.ts + index.ts         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | PAI standard, matches codebase |
| Runtime | Bun | PAI standard, already in use |
| CLI | Commander.js | Existing pattern in `src/commands/` |
| Database | bun:sqlite | Existing via UnifiedSchemaService |
| Output | Effect Schema | User requirement |
| Testing | bun:test | Existing test framework |

## Constitutional Compliance

- [x] **CLI-First:** New `supertag codegen` command with flags for output, format, tags, naming
- [x] **Library-First:** Core logic in `src/codegen/` module, CLI is thin wrapper
- [x] **Test-First:** TDD with unit tests for type mapping, snapshot tests for output
- [x] **Deterministic:** Pure transformation from DB data → TypeScript code (no AI/LLM)
- [x] **Code Before Prompts:** 100% code - no prompts involved

## Data Model

### Input: UnifiedSupertag (existing)

```typescript
interface UnifiedSupertag {
  id: string;
  name: string;
  normalizedName: string;
  description?: string | null;
  color?: string | null;
  fields: UnifiedField[];
  extends?: string[];
}

interface UnifiedField {
  tagId: string;
  attributeId: string;
  name: string;
  normalizedName: string;
  description?: string | null;
  dataType?: string | null;  // 'text'|'date'|'reference'|'url'|'email'|'number'|'checkbox'|'options'
  order: number;
}
```

### Internal: CodegenSupertag

```typescript
interface CodegenSupertag {
  id: string;
  name: string;
  className: string;        // PascalCase, valid TS identifier
  fields: CodegenField[];
  parentClassName?: string; // For inheritance via .extend()
  metadata: {
    syncedAt: string;       // ISO timestamp
    tagId: string;
  };
}

interface CodegenField {
  originalName: string;
  propertyName: string;     // camelCase, valid TS identifier
  effectSchema: string;     // e.g., "Schema.String", "Schema.optionalWith(...)"
  comment?: string;
  isOptional: boolean;
}
```

### Output: Effect Schema Class

```typescript
// Generated from Tana supertag: TodoItem
// Supertag ID: abc123xyz
// Last synced: 2025-12-28T10:30:00Z

export class TodoItem extends Schema.Class<TodoItem>("TodoItem")({
  /** Tana node ID */
  id: Schema.String,

  /** Node name/title */
  title: Schema.String,

  /** Due Date field */
  dueDate: Schema.optionalWith(Schema.DateFromString, { as: "Option" }),
}) {}
```

## API Contracts

### Internal APIs

```typescript
// src/codegen/types.ts
interface CodegenOptions {
  outputPath: string;
  tags?: string[];           // Filter to specific tags
  format: 'effect';          // Future: 'zod' | 'typescript'
  optionalStrategy: 'option' | 'undefined' | 'nullable';
  naming: 'camelCase' | 'PascalCase' | 'snake_case';
  includeMetadata: boolean;
  split: boolean;            // Multi-file output
  includeInherited: boolean; // Include inherited fields
}

// src/codegen/index.ts
function generateSchemas(
  db: Database,
  options: CodegenOptions
): Promise<GenerationResult>

interface GenerationResult {
  files: GeneratedFile[];
  stats: {
    supertagsProcessed: number;
    fieldsProcessed: number;
    filesGenerated: number;
  };
}

interface GeneratedFile {
  path: string;
  content: string;
}

// src/codegen/type-mapper.ts
function mapDataTypeToEffect(
  dataType: DataType,
  options: { optionalStrategy: 'option' | 'undefined' | 'nullable' }
): string

// src/codegen/naming.ts
function toValidIdentifier(name: string, style: 'camelCase' | 'PascalCase' | 'snake_case'): string
function toClassName(name: string): string
function toPropertyName(name: string): string

// src/codegen/effect-generator.ts
function generateEffectClass(
  supertag: CodegenSupertag,
  options: CodegenOptions
): string

function generateEffectFile(
  supertags: CodegenSupertag[],
  options: CodegenOptions
): string
```

## Type Mapping Table

| Tana DataType | Effect Schema | Wrapped (optional) |
|---------------|---------------|-------------------|
| `text` | `Schema.String` | `Schema.optionalWith(Schema.String, { as: "Option" })` |
| `number` | `Schema.Number` | `Schema.optionalWith(Schema.Number, { as: "Option" })` |
| `date` | `Schema.DateFromString` | `Schema.optionalWith(Schema.DateFromString, { as: "Option" })` |
| `checkbox` | `Schema.Boolean` | `Schema.optionalWith(Schema.Boolean, { as: "Option" })` |
| `url` | `Schema.String.pipe(Schema.pattern(...))` | Wrapped in optionalWith |
| `email` | `Schema.String.pipe(Schema.pattern(...))` | Wrapped in optionalWith |
| `reference` | `Schema.String` | Node ID as string |
| `options` | `Schema.Union(Schema.Literal(...))` | When values known |
| `null/undefined` | `Schema.String` | Default fallback |

## Implementation Strategy

### Phase 1: Foundation (Core Types & Type Mapper)

Build the foundational types and mapping logic with full test coverage.

- [ ] Create `src/codegen/types.ts` - CodegenOptions, CodegenSupertag, CodegenField
- [ ] Create `src/codegen/type-mapper.ts` - DataType → Effect Schema mapping
- [ ] Create `src/codegen/naming.ts` - Field/class name normalization
- [ ] Create `tests/codegen/type-mapper.test.ts` - Unit tests for all mappings
- [ ] Create `tests/codegen/naming.test.ts` - Unit tests for name normalization

### Phase 2: Core Generator

Build the Effect Schema class generator with template-based output.

- [ ] Create `src/codegen/effect-generator.ts` - Class generation logic
- [ ] Create `src/codegen/index.ts` - Main entry point orchestrating generation
- [ ] Create `tests/codegen/effect-generator.test.ts` - Snapshot tests
- [ ] Handle inheritance via `Schema.Class.extend()` pattern
- [ ] Add JSDoc comments from field descriptions

### Phase 3: CLI Integration

Wire into the existing CLI with proper options.

- [ ] Create `src/commands/codegen.ts` - Commander.js command
- [ ] Add to `src/index.ts` - Register command
- [ ] Create `tests/codegen/cli.test.ts` - CLI integration tests
- [ ] Handle workspace context (consistent with other commands)
- [ ] Support both single-file and multi-file output modes

### Phase 4: Documentation & Polish

- [ ] Update README.md with codegen documentation
- [ ] Add examples to CLAUDE.md
- [ ] Handle edge cases (reserved words, special characters)
- [ ] Validate generated code compiles (TypeScript check)

## File Structure

```
src/
├── codegen/
│   ├── index.ts              # [New] Main entry point
│   ├── types.ts              # [New] Type definitions
│   ├── type-mapper.ts        # [New] DataType → Effect mapping
│   ├── naming.ts             # [New] Name normalization utilities
│   └── effect-generator.ts   # [New] Effect Schema class generator
├── commands/
│   └── codegen.ts            # [New] CLI command definition
├── services/
│   └── unified-schema-service.ts  # [Existing - no changes]
└── index.ts                  # [Modified] Register codegen command

tests/
├── codegen/
│   ├── type-mapper.test.ts   # [New] Type mapping tests
│   ├── naming.test.ts        # [New] Name normalization tests
│   ├── effect-generator.test.ts  # [New] Snapshot tests
│   └── cli.test.ts           # [New] CLI integration tests
└── __snapshots__/
    └── effect-generator.test.ts.snap  # [New] Expected output
```

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Effect API changes | Medium | Low | Pin Effect version in generated comments; version check |
| Invalid TS identifiers | High | Medium | Comprehensive naming.ts with reserved word handling |
| Options type extraction | Medium | Medium | Fall back to `Schema.String` when options unknown |
| Diamond inheritance | Low | Low | Already handled by UnifiedSchemaService deduplication |
| Generated code doesn't compile | High | Low | Add TypeScript compilation check in tests |
| Large schema files | Low | Low | Support `--split` for multi-file output |

## Dependencies

### External

- `effect` - User's dependency (not installed in supertag-cli itself)
- `commander` - Already installed, CLI framework

### Internal

- `UnifiedSchemaService` - Supertag/field data source
- `DataType` type from `src/utils/infer-data-type.ts`
- `resolveWorkspace` from `src/config/paths.ts`
- Commander.js patterns from `src/commands/schema.ts`

## Migration/Deployment

- [ ] **Database migrations needed?** No - uses existing schema
- [ ] **Environment variables?** No
- [ ] **Breaking changes?** No - new feature, additive only
- [ ] **User action required?** User must have `effect` installed in their project

## Estimated Complexity

- **New files:** 7 (5 source + 2 test files)
- **Modified files:** 1 (src/index.ts)
- **Test files:** 4 (type-mapper, naming, effect-generator, cli)
- **Estimated tasks:** 12-15

## Open Questions

1. **Option values extraction**: Should we query `field_values` table to extract known options for `options` type fields, or just use `Schema.String`?
   - **Recommendation**: MVP uses `Schema.String`, future enhancement adds option extraction

2. **Inheritance model**: Use Effect's `Schema.Class.extend()` or flatten all fields?
   - **Recommendation**: Use `.extend()` when parent tag is also being generated, otherwise flatten

3. **Id field**: Should generated classes always include a Tana node ID field?
   - **Recommendation**: Yes, always include `id: Schema.String` as first field
