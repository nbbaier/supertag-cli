---
feature: "query-field-output"
plan: "./plan.md"
status: "ready"
---

# Implementation Tasks: Query Field Output

## Task Groups

### Group 1: Foundation (can parallelize T1-T3)

#### T1: Parser - Handle `select *` syntax
**File:** `src/query/parser.ts`
**TDD:**
1. RED: Add test `should parse 'select *' as wildcard` in `tests/query-parser.test.ts`
2. GREEN: Update `parseSelectClause()` to detect `*` identifier and return `["*"]`
3. VERIFY: All parser tests pass

**Acceptance:** `parseQuery("find person select *")` returns `{ find: "person", select: ["*"] }`

#### T2: Types - Update SelectClause type
**File:** `src/query/types.ts`
**TDD:**
1. RED: TypeScript compilation should fail when passing `"*"` string
2. GREEN: Update `QueryAST.select` type to `string[] | undefined`
3. VERIFY: Type checking passes

**Acceptance:** AST can hold `select: ["*"]` or `select: ["name", "email"]`

#### T3: FieldResolver - Create service
**File:** `src/services/field-resolver.ts` (NEW)
**TDD:**
1. RED: Create `tests/field-resolver.test.ts` with in-memory DB
   - Test `getSupertag Fields("person")` returns field names
   - Test `resolveFields(nodeIds, fields)` returns field values
   - Test inherited fields are included
2. GREEN: Implement FieldResolver class
3. VERIFY: All field resolver tests pass

**Acceptance:**
```typescript
const resolver = new FieldResolver(db);
resolver.getSupertag Fields("person"); // ["Email", "Phone", "Company"]
resolver.resolveFields(["node1", "node2"], ["Email"]);
// Map { "node1" => { Email: "a@b.com" }, "node2" => { Email: "c@d.com" } }
```

---

### Group 2: Core Integration (sequential, depends on Group 1)

#### T4: Query Engine - Integrate FieldResolver
**File:** `src/query/unified-query-engine.ts`
**TDD:**
1. RED: Add test `should include field values when select specified`
2. GREEN: After base query, call FieldResolver if `ast.select` present
3. VERIFY: Engine tests pass

**Acceptance:** `engine.execute({ find: "person", select: ["Email"] })` returns nodes with `fields.Email`

#### T5: Query Engine - Handle `select *`
**File:** `src/query/unified-query-engine.ts`
**TDD:**
1. RED: Add test `should include all fields when select is *`
2. GREEN: Detect `["*"]` and call `getSupertag Fields()` to get all field names
3. VERIFY: Engine tests pass

**Acceptance:** `engine.execute({ find: "person", select: ["*"] })` returns all person fields

---

### Group 3: Output Formatting (can parallelize T6-T8)

#### T6: Query Command - Dynamic columns for table format
**File:** `src/commands/query.ts`
**TDD:**
1. RED: Integration test with `--format table` and `select *`
2. GREEN: Build table headers from `result.fieldNames`, include field values in rows
3. VERIFY: Table output shows field columns

**Acceptance:** `supertag query "find person select *" --format table` shows Email, Phone columns

#### T7: Query Command - Dynamic columns for CSV format
**File:** `src/commands/query.ts`
**TDD:**
1. RED: Integration test with `--format csv` and `select "name,email"`
2. GREEN: Output CSV with field headers and values
3. VERIFY: CSV format correct

**Acceptance:** `supertag query 'find person select "name,email"' --format csv` outputs valid CSV

#### T8: Query Command - JSON/JSONL with fields
**File:** `src/commands/query.ts`
**TDD:**
1. RED: Integration test with `--format json` and `select *`
2. GREEN: Add `fields` object to each result
3. VERIFY: JSON includes field data

**Acceptance:** JSON output includes `{ "id": "...", "name": "...", "fields": { "Email": "..." } }`

---

### Group 4: Final Integration

#### T9: Multi-value field handling
**File:** `src/services/field-resolver.ts`
**TDD:**
1. RED: Test with node having multiple values for same field
2. GREEN: Comma-join multiple values: `"value1, value2"`
3. VERIFY: Multi-value test passes

**Acceptance:** Node with 2 emails outputs `"a@b.com, c@d.com"`

#### T10: MCP Tool Update
**File:** `src/mcp/tools/query.ts`
**TDD:**
1. RED: MCP test with select clause
2. GREEN: Include fields in MCP response
3. VERIFY: MCP returns field data

**Acceptance:** `tana_query({ find: "person", select: ["*"] })` includes fields

---

## Execution Order

```
T1 ─┬─► T4 ─► T5 ─┬─► T6 ─┬─► T9 ─► T10
T2 ─┤             │       │
T3 ─┘             │       ├─► T7
                  │       │
                  └───────┴─► T8
```

**Parallelizable:** T1, T2, T3 (Foundation) | T6, T7, T8 (Output)
**Sequential:** T4 depends on T1-T3 | T5 depends on T4 | T9-T10 at end

---

## Doctorow Gate Checklist

Before marking complete:

- [ ] All tests pass (`bun run test`)
- [ ] No select clause = core fields only (backward compatible)
- [ ] `select *` includes inherited fields
- [ ] `select "f1,f2"` includes only specified fields
- [ ] Unknown fields silently ignored
- [ ] Multi-value fields comma-joined
- [ ] All 6 output formats work
- [ ] MCP tool returns fields
- [ ] Binary rebuilt (`./scripts/build.sh`)
