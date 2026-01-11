# Native Code Rewrite Analysis

This document analyzes which components of supertag-cli would benefit most from being rewritten in native code (Rust).

## Executive Summary

A full Rust rewrite is **not recommended** (6-8 months, MCP SDK gap), but selective native modules for performance-critical components offer high ROI with minimal risk.

**Best candidate**: Export Parser + Indexer — processes 1.3M+ nodes, currently 107k nodes/sec, could achieve 3-5x speedup.

---

## Evaluation Criteria

Components were evaluated on:

1. **CPU-bound work** — Not I/O bound (network, disk)
2. **Clear API boundaries** — Easy to call from TypeScript/Bun
3. **Performance-critical** — Actually benefits from native code
4. **Self-contained** — Minimal dependencies on rest of codebase

---

## Candidate Rankings

### 1. Export Parser + Indexer (Best Candidate)

**Files**:
- `src/parsers/tana-export.ts`
- `src/db/indexer.ts`
- `src/db/field-values.ts`

**Current performance**: 107k nodes/sec

**Why it's ideal**:
- Processes **1.3M+ nodes** from Tana exports
- Native code could achieve 3-5x speedup (300k-500k nodes/sec)
- **CPU-bound** work: JSON parsing → graph building → SQLite writes
- **Clean boundary**: Input is a JSON file, output is a SQLite database
- **Self-contained**: No network calls, no browser, no MCP protocol

**Processing pipeline**:
```
JSON file
  → Parse with Zod validation
  → Build in-memory graph
  → Detect supertags (SYS_A13 + SYS_T01 tuples)
  → Detect fields (SYS_A13 + SYS_T02 tuples)
  → Extract inline references (<span data-inlineref-node="...">)
  → Detect tag applications
  → Extract field values from tuples
  → Write to SQLite (nodes, supertags, fields, references, field_values, etc.)
```

**Rust crates**:
- `serde` + `serde_json` — JSON parsing
- `rusqlite` — SQLite database
- `rayon` — Parallel processing
- `regex` — Inline reference extraction

**Integration options**:

```typescript
// Option A: Subprocess (simplest, recommended for Phase 1)
const result = await $`./supertag-indexer ${exportPath} ${dbPath}`.json();

// Option B: Bun FFI (fastest, Phase 2)
const lib = dlopen("libsupertag_indexer.dylib", {
  index: { args: ["cstring", "cstring"], returns: "i32" }
});
```

**Estimated effort**: 2-3 weeks for working indexer, +1 week for polish/tests

---

### 2. Query Parser (Lower Priority)

**Files**:
- `src/query/parser.ts`
- `src/query/tokenizer.ts`

**Current size**: ~460 lines TypeScript

**Why it's a candidate**:
- Recursive descent parser is a classic Rust use case
- Produces clean AST that TypeScript can consume
- Type-safe parsing with good error messages

**Why lower priority**:
- Parsing is already fast (<1ms for typical queries)
- SQL execution is the bottleneck, not parsing
- SQLite query execution is already native

**Best implementation**: WASM module (portable, easy JS interop)

**Rust crates**:
- `nom` or `pest` — Parser combinators
- `wasm-bindgen` — WASM/JS bridge

**Estimated effort**: 1-2 weeks

---

### 3. Field Value Extraction (Merge with #1)

**Files**: `src/db/field-values.ts`

**Why**:
- Complex tuple structure parsing
- Handles mega-tuples with 50-1000+ children
- Currently runs during indexing phase

**Recommendation**: Include in native indexer rather than separate module

---

## Not Worth Native Rewrite

| Component | Files | Reason |
|-----------|-------|--------|
| **FTS Search** | `src/commands/search.ts` | Already uses native SQLite FTS5 |
| **Semantic Search** | `src/embeddings/*` | LanceDB + embedding models are already native |
| **MCP Server** | `src/mcp/*` | I/O bound (network), protocol overhead dominates |
| **HTTP Server** | `src/server/*` | Fastify is highly optimized C++ under the hood |
| **Output Formatter** | `src/utils/output-formatter.ts` | I/O bound (terminal), formatting is trivial |
| **Browser Automation** | `src/cli/tana-export.ts` | Playwright controls Chromium, not CPU-bound |

---

## Recommended Implementation Plan

### Phase 1: Standalone Rust Indexer Binary

**Goal**: Replace the slowest part with minimal integration complexity

**Deliverable**: `supertag-indexer` binary

**Interface**:
```bash
supertag-indexer <export.json> <output.db> [--schema-only] [--stats]
```

**Output**:
- Populated SQLite database
- JSON stats to stdout:
```json
{
  "nodesIndexed": 1300000,
  "supertagsIndexed": 2500,
  "fieldsIndexed": 15000,
  "referencesIndexed": 450000,
  "durationMs": 4200
}
```

**TypeScript integration**:
```typescript
// src/db/native-indexer.ts
export async function indexWithNative(exportPath: string, dbPath: string): Promise<IndexResult> {
  const proc = Bun.spawn(["supertag-indexer", exportPath, dbPath, "--stats"]);
  const output = await new Response(proc.stdout).json();
  return output as IndexResult;
}
```

**Estimated effort**: 2-3 weeks

### Phase 2: Shared Library with Bun FFI (Optional)

**Goal**: Eliminate subprocess overhead for tighter integration

**Deliverable**: `libsupertag_indexer.{dylib,so,dll}`

**Interface**:
```typescript
const lib = dlopen("libsupertag_indexer.dylib", {
  index_export: {
    args: ["cstring", "cstring"],
    returns: "ptr"  // Returns JSON stats pointer
  },
  free_result: {
    args: ["ptr"],
    returns: "void"
  }
});
```

**Estimated effort**: +1 week on top of Phase 1

### Phase 3: WASM Query Parser (Optional)

**Goal**: Type-safe, fast query parsing with better error messages

**Deliverable**: `supertag_query.wasm`

**Interface**:
```typescript
import { parseQuery } from './supertag_query.js';

const ast = parseQuery("find todo where Status = Done and Priority >= 2");
// Returns QueryAST or throws ParseError with position info
```

**Estimated effort**: 1-2 weeks

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rust learning curve | Medium | Start with Phase 1 (simpler scope) |
| SQLite schema drift | Low | Generate schema from TypeScript definitions |
| Cross-platform builds | Medium | Use `cross` for Linux/Windows from macOS |
| Debugging complexity | Medium | Comprehensive logging, JSON output for inspection |
| Feature parity | Low | Extensive test coverage, compare outputs |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Indexing speed | 107k nodes/sec | 300k+ nodes/sec |
| Memory usage (1M nodes) | ~2GB peak | <500MB peak |
| Binary size | N/A (new) | <5MB |
| Cold start time | N/A | <50ms |

---

## Appendix: Codebase Statistics

From full codebase analysis:

- **Total TypeScript**: 87,230 lines
- **Test coverage**: 34,877 lines (40% of codebase)
- **Indexer module**: 1,163 lines
- **Export parser**: ~400 lines
- **Field extraction**: 532 lines
- **Query parser**: 461 lines

**Current indexer bottlenecks** (in order):
1. JSON parsing (serde_json is 5-10x faster than JS)
2. Graph building (Map operations, object allocation)
3. SQLite batch inserts (already optimized with transactions)
4. Zod validation (runtime type checking overhead)
