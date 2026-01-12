# Library Mode Implementation Plan

> **Spec**: [library-spec.md](../library-spec.md)  
> **Issue**: Fixes nbbaier/supertag-cli#1

This document provides a phased implementation plan with verifiable checkpoints for adding library/headless mode to supertag-cli.

---

## Current State Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| `src/lib.ts` | ✅ Exists | Basic exports, no SupertagClient |
| `package.json` exports | ⚠️ Partial | Only `.` entry, missing subpaths |
| `src/db/index.ts` | ✅ Exists | Good coverage |
| `src/api/index.ts` | ❌ Missing | Need barrel file |
| `src/types/index.ts` | ❌ Missing | Need barrel file |
| `src/search/index.ts` | ❌ Missing | Need barrel file |
| `src/db/graph/` | ❌ Missing | Need directory + barrel |
| SupertagClient | ❌ Missing | Core high-level API |
| API hooks | ❌ Missing | beforeRequest/afterResponse |
| Cancellation | ❌ Missing | AbortController support |
| Documentation | ⚠️ Partial | `docs/LIBRARY.md` exists |

---

## Phase 1: Subpath Exports Infrastructure

**Goal**: All subpath imports work correctly

**Duration**: ~2 hours

### Tasks

#### 1.1 Create Barrel Files

| File | Exports |
|------|---------|
| `src/api/index.ts` | `TanaApiClient`, `getGlobalRateLimiter`, `RateLimiter` |
| `src/types/index.ts` | All types from `src/types.ts` + `src/types/*.ts` |
| `src/search/index.ts` | Placeholder for `semanticSearch` |
| `src/db/graph/index.ts` | `getAncestors`, `getDescendants`, `isEntity`, `findNearestEntityAncestor` |

#### 1.2 Update package.json

Add subpath exports:

```json
{
  "exports": {
    ".": { "import": "./src/lib.ts", "types": "./src/lib.ts" },
    "./db": { "import": "./src/db/index.ts", "types": "./src/db/index.ts" },
    "./api": { "import": "./src/api/index.ts", "types": "./src/api/index.ts" },
    "./query": { "import": "./src/db/query-builder.ts", "types": "./src/db/query-builder.ts" },
    "./graph": { "import": "./src/db/graph/index.ts", "types": "./src/db/graph/index.ts" },
    "./types": { "import": "./src/types/index.ts", "types": "./src/types/index.ts" },
    "./format": { "import": "./src/utils/output-formatter.ts", "types": "./src/utils/output-formatter.ts" },
    "./errors": { "import": "./src/utils/structured-errors.ts", "types": "./src/utils/structured-errors.ts" },
    "./search": { "import": "./src/search/index.ts", "types": "./src/search/index.ts" }
  }
}
```

#### 1.3 Add closeDatabase Function

Add to `src/db/with-database.ts`:

```typescript
export function closeDatabase(db: Database): void {
  db.close();
}
```

### Checkpoints

- [ ] **CP-1.1**: `bun run typecheck` passes
- [ ] **CP-1.2**: Import test passes:
  ```typescript
  // test-imports.ts
  import { TanaApiClient } from 'supertag-cli';
  import { withDatabase, createDatabase, closeDatabase } from 'supertag-cli/db';
  import { TanaApiClient as ApiClient } from 'supertag-cli/api';
  import { buildPagination } from 'supertag-cli/query';
  import { isEntity, findNearestEntityAncestor } from 'supertag-cli/graph';
  import type { TanaNode, WorkspaceConfig } from 'supertag-cli/types';
  import { formatAsTable } from 'supertag-cli/format';
  import { StructuredError } from 'supertag-cli/errors';
  ```
- [ ] **CP-1.3**: CLI still works: `bun run src/index.ts --help`
- [ ] **CP-1.4**: `bun run test` passes (existing tests unbroken)

---

## Phase 2: SupertagClient Implementation

**Goal**: High-level client with auto-resolution and full feature set

**Duration**: ~4 hours

### Tasks

#### 2.1 Create Client Directory Structure

```
src/client/
├── index.ts              # Barrel exports
├── SupertagClient.ts     # Main client class
├── types.ts              # Client-specific types
└── config-resolver.ts    # Config priority resolution
```

#### 2.2 Implement SupertagClientOptions

```typescript
interface SupertagClientOptions {
  workspace?: string;           // Workspace alias
  apiToken?: string;            // Override token
  apiEndpoint?: string;         // Override endpoint
  logLevel?: 'debug' | 'info' | 'error' | 'silent';  // Default: 'silent'
  dbPath?: string;              // Override database path
}
```

#### 2.3 Implement SupertagClient Class

```typescript
/**
 * @beta
 */
class SupertagClient {
  constructor(options?: SupertagClientOptions);
  
  // Search operations
  search(query: string, options?: SearchOptions): Promise<TanaNode[]>;
  semanticSearch(query: string, options?: SearchOptions): Promise<TanaNode[]>;
  
  // Tag operations
  findByTag(tagName: string, options?: TagQueryOptions): Promise<TanaNode[]>;
  getTags(): Promise<SupertagInfo[]>;
  
  // Node operations
  getNode(id: string): Promise<TanaNode | null>;
  getNodeWithChildren(id: string, depth?: number): Promise<TanaNode | null>;
  
  // Write operations
  createNode(target: string, node: CreateNodeInput): Promise<CreateNodeResult>;
  createNodesBatch(nodes: CreateNodeInput[], options?: BatchOptions): Promise<BatchResult>;
  
  // Field operations
  getFieldValues(fieldName: string, options?: FieldQueryOptions): Promise<FieldValue[]>;
  searchByField(fieldName: string, value: string): Promise<TanaNode[]>;
  
  // Graph traversal
  getAncestors(nodeId: string, options?: TraversalOptions): Promise<TanaNode[]>;
  getDescendants(nodeId: string, options?: TraversalOptions): Promise<TanaNode[]>;
  
  // Raw database access
  query<T>(sql: string, params?: unknown[]): T[];
  
  // Lifecycle
  close(): void;
}
```

#### 2.4 Implement Config Priority Resolution

Priority order (highest to lowest):
1. Constructor injection
2. Environment variables (`SUPERTAG_API_TOKEN`, `SUPERTAG_WORKSPACE`, `SUPERTAG_API_ENDPOINT`)
3. Config file (`~/.config/supertag/config.json`)

#### 2.5 Add @beta JSDoc Markers

All public exports get `@beta` stability marker:

```typescript
/**
 * High-level client for Tana operations.
 * 
 * @beta This API is not yet stable and may change in future versions.
 * 
 * @example
 * ```typescript
 * const client = new SupertagClient();
 * const results = await client.search("meeting");
 * ```
 */
export class SupertagClient { ... }
```

### Checkpoints

- [ ] **CP-2.1**: Basic instantiation works:
  ```typescript
  const client = new SupertagClient();
  const client2 = new SupertagClient({ workspace: 'main' });
  ```
- [ ] **CP-2.2**: Search operations return results:
  ```typescript
  const results = await client.search("test", { limit: 5 });
  assert(Array.isArray(results));
  ```
- [ ] **CP-2.3**: Write operations work (dry-run):
  ```typescript
  const result = await client.createNode("INBOX", { 
    name: "Test", 
    supertag: "note" 
  }, { dryRun: true });
  assert(result.success);
  ```
- [ ] **CP-2.4**: Config priority works:
  ```typescript
  // Constructor overrides env
  process.env.SUPERTAG_WORKSPACE = 'env-workspace';
  const client = new SupertagClient({ workspace: 'constructor-workspace' });
  assert(client.workspace === 'constructor-workspace');
  ```
- [ ] **CP-2.5**: `bun run typecheck` passes
- [ ] **CP-2.6**: `bun run test` passes

---

## Phase 3: API Client Enhancements

**Goal**: Add hooks, configurable rate limiting, and cancellation support

**Duration**: ~3 hours

### Tasks

#### 3.1 Add Request/Response Hooks

Update `TanaApiClient` constructor:

```typescript
interface TanaApiClientOptions {
  apiToken: string;
  endpoint?: string;
  rateLimit?: {
    requestsPerMinute?: number;  // Default: 60
    burstSize?: number;          // Default: 5
  };
  beforeRequest?: (request: RequestInfo) => RequestInfo | Promise<RequestInfo>;
  afterResponse?: (response: Response, request: RequestInfo) => Response | Promise<Response>;
}

class TanaApiClient {
  constructor(options: TanaApiClientOptions);
  // ... existing methods
}
```

#### 3.2 Configurable Rate Limiting

Update `src/api/rateLimit.ts`:

```typescript
interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
}

function createRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter;
```

#### 3.3 AbortController Support

Update batch operations in `src/services/batch-operations.ts`:

```typescript
interface BatchOptions {
  onError: 'throw' | 'continue' | 'rollback';
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

interface BatchResult<T> {
  succeeded: T[];
  failed: Array<{ item: T; error: Error }>;
  aborted: boolean;
}
```

#### 3.4 Update SupertagClient to Use Enhanced Options

Wire hooks and cancellation through to underlying clients.

### Checkpoints

- [ ] **CP-3.1**: Hooks are called:
  ```typescript
  let hookCalled = false;
  const client = new TanaApiClient({
    apiToken: 'test',
    beforeRequest: (req) => { hookCalled = true; return req; }
  });
  // Make request...
  assert(hookCalled);
  ```
- [ ] **CP-3.2**: Rate limiting respects config:
  ```typescript
  const limiter = createRateLimiter({ requestsPerMinute: 120 });
  // Verify timing behavior
  ```
- [ ] **CP-3.3**: Cancellation stops batch operations:
  ```typescript
  const controller = new AbortController();
  const promise = client.createNodesBatch(nodes, { signal: controller.signal });
  controller.abort();
  const result = await promise;
  assert(result.aborted === true);
  ```
- [ ] **CP-3.4**: `bun run typecheck` passes
- [ ] **CP-3.5**: `bun run test` passes

---

## Phase 4: Graph & Search Exports

**Goal**: Export graph traversal and semantic search utilities

**Duration**: ~2 hours

### Tasks

#### 4.1 Create Graph Module

Create `src/db/graph/index.ts`:

```typescript
export { 
  isEntity, 
  isEntityById, 
  findNearestEntityAncestor 
} from '../entity';

// Re-export from GraphTraversalService or create standalone functions
export function getAncestors(db: Database, nodeId: string, options?: TraversalOptions): TanaNode[];
export function getDescendants(db: Database, nodeId: string, options?: TraversalOptions): TanaNode[];
```

#### 4.2 Create Search Module

Create `src/search/index.ts`:

```typescript
/**
 * Semantic search over pre-generated embeddings.
 * 
 * @beta
 * @requires Embeddings must be generated via CLI: `supertag embed generate`
 */
export async function semanticSearch(
  db: Database, 
  query: string, 
  options?: SemanticSearchOptions
): Promise<SearchResult[]>;

export interface SemanticSearchOptions {
  limit?: number;
  threshold?: number;
  tags?: string[];
}
```

#### 4.3 Export Schema Migration Utilities

Add to `src/db/index.ts`:

```typescript
export { 
  getDatabaseVersion, 
  migrateDatabase, 
  LATEST_SCHEMA_VERSION 
} from './migrate';
```

#### 4.4 Update lib.ts Exports

Add new exports to main entry point.

### Checkpoints

- [ ] **CP-4.1**: Graph imports work:
  ```typescript
  import { getAncestors, getDescendants, isEntity } from 'supertag-cli/graph';
  ```
- [ ] **CP-4.2**: Search imports work:
  ```typescript
  import { semanticSearch } from 'supertag-cli/search';
  ```
- [ ] **CP-4.3**: Migration utilities accessible:
  ```typescript
  import { getDatabaseVersion, LATEST_SCHEMA_VERSION } from 'supertag-cli/db';
  const version = getDatabaseVersion(dbPath);
  ```
- [ ] **CP-4.4**: `bun run typecheck` passes
- [ ] **CP-4.5**: `bun run test` passes

---

## Phase 5: Documentation & Testing

**Goal**: Complete documentation, examples, and library-specific tests

**Duration**: ~4 hours

### Tasks

#### 5.1 Create Documentation Structure

```
docs/library/
├── README.md              # Getting started, installation
├── api-reference.md       # Complete API documentation
├── database.md            # Database access patterns
├── api-client.md          # TanaApiClient usage
├── graph.md               # Graph traversal helpers
├── errors.md              # Error handling guide
└── migration.md           # Migrating between versions
```

#### 5.2 Update docs/library/README.md

```markdown
# Supertag CLI Library Mode

Use supertag-cli as a TypeScript library in your applications.

## Installation

\`\`\`bash
bun add supertag-cli
# or
npm install supertag-cli
\`\`\`

## Quick Start

\`\`\`typescript
import { SupertagClient } from 'supertag-cli';

const client = new SupertagClient();
const meetings = await client.search("meeting", { limit: 10 });
\`\`\`
```

#### 5.3 Create Library Tests

```
tests/library/
├── imports.test.ts        # All subpath imports work
├── client.test.ts         # SupertagClient functionality
├── hooks.test.ts          # API hooks
├── batch.test.ts          # Batch operations + cancellation
└── config-priority.test.ts # Config resolution order
```

#### 5.4 Enhance Example Application

Update `examples/library-usage/`:

- Add all SupertagClient methods
- Show batch operations with error handling
- Demonstrate cancellation
- Show config override patterns

#### 5.5 Update Main Documentation

- Update root `README.md` with Library Mode section
- Update `CHANGELOG.md` with library mode entry

### Checkpoints

- [ ] **CP-5.1**: All docs render correctly (no broken links)
- [ ] **CP-5.2**: Example runs successfully:
  ```bash
  cd examples/library-usage
  bun install
  bun run start
  ```
- [ ] **CP-5.3**: Library tests pass:
  ```bash
  bun test tests/library/
  ```
- [ ] **CP-5.4**: Full test suite passes:
  ```bash
  bun run test:full
  ```
- [ ] **CP-5.5**: CLI still works:
  ```bash
  ./supertag search "test"
  ```

---

## Final Verification Checklist

Before marking complete, verify all of these:

### Functionality

- [ ] All subpath imports work in both Bun and Node.js
- [ ] SupertagClient auto-resolves workspace correctly
- [ ] Config priority (constructor > env > file) works
- [ ] Batch operations with `onError: 'continue'` work
- [ ] AbortController cancellation works
- [ ] API hooks are called correctly
- [ ] Semantic search works with pre-generated embeddings
- [ ] Graph traversal functions work

### Compatibility

- [ ] CLI functionality unchanged (`./supertag --help`)
- [ ] All existing tests pass
- [ ] TypeScript types are correct and complete
- [ ] Works in Bun runtime
- [ ] Works in Node.js runtime

### Documentation

- [ ] `docs/library/README.md` complete
- [ ] `docs/library/api-reference.md` complete
- [ ] Root README updated
- [ ] CHANGELOG updated
- [ ] All exports have JSDoc with `@beta` marker

### Quality

- [ ] `bun run typecheck` passes
- [ ] `bun run test:full` passes
- [ ] No new linting warnings
- [ ] Example application works end-to-end

---

## Dependency Graph

```
Phase 1 (Subpath Exports)
    │
    ▼
Phase 2 (SupertagClient)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3 (API Hooks)   Phase 4 (Graph/Search)
    │                  │
    └────────┬─────────┘
             ▼
      Phase 5 (Docs & Tests)
```

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 2 hours | None |
| Phase 2 | 4 hours | Phase 1 |
| Phase 3 | 3 hours | Phase 2 |
| Phase 4 | 2 hours | Phase 1 |
| Phase 5 | 4 hours | Phases 3, 4 |
| **Total** | **~15 hours** | |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking CLI functionality | Run CLI tests after each phase |
| Type export issues | Test imports in separate project |
| Node.js compatibility | Test with `node --experimental-strip-types` |
| Rate limiting complexity | Start with simple config, iterate |
| Graph function complexity | Wrap existing GraphTraversalService |

---

## Notes

- All exports use `@beta` JSDoc marker until API stabilizes
- No event emission in initial release (request-response only)
- MCP server remains CLI-only
- No mock implementations provided for testing
