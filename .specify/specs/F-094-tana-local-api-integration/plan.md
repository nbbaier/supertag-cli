# Technical Plan: F-094 tana-local API Integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           supertag-cli v1.14                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Commands Layer                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ create   │ │ update   │ │ tag      │ │ set-field│ │ delete   │          │
│  │ (exists) │ │ (NEW)    │ │ (NEW)    │ │ (NEW)    │ │ (NEW)    │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │            │            │            │            │                 │
├───────┴────────────┴────────────┴────────────┴────────────┴─────────────────┤
│  Services Layer                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    node-builder.ts (MODIFIED)                        │   │
│  │  - createNode()    (exists, uses backend)                           │   │
│  │  - updateNode()    (NEW)                                            │   │
│  │  - addTag()        (NEW)                                            │   │
│  │  - removeTag()     (NEW)                                            │   │
│  │  - setField()      (NEW)                                            │   │
│  │  - deleteNode()    (NEW)                                            │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
├───────────────────────────────────┴─────────────────────────────────────────┤
│  API Layer (Backend Abstraction)                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              TanaBackend (NEW interface)                            │    │
│  │  createNodes() | updateNode() | deleteNode() | addTag() | ...       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│           │                                    │                            │
│  ┌────────┴───────────┐           ┌───────────┴────────────┐               │
│  │  InputApiBackend   │           │  LocalApiBackend (NEW)  │               │
│  │  (existing client) │           │  http://localhost:8262  │               │
│  │  - createNodes()   │           │  - ALL operations       │               │
│  │  - (no mutations)  │           │  - Real-time            │               │
│  └────────────────────┘           └─────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| HTTP Client | Native `fetch` | Consistent with existing Input API client |
| Token Storage | config.json | Existing pattern, supports CLI flags override |
| Type Safety | Zod schemas | Contract validation against OpenAPI spec |
| Error Handling | Structured errors | Existing pattern from F-073 |
| Testing | Contract tests | No live server dependency |

## Constitutional Compliance Checklist

- [x] **CLI-First**: All new capabilities exposed as CLI commands
- [x] **Library-First**: Core logic in services/api layer, not commands
- [x] **Test-First**: Contract tests against OpenAPI spec
- [x] **Deterministic**: No probabilistic behavior
- [x] **Code Before Prompts**: Logic in code, prompts only for UI

## Data Model

### Configuration Extension

```typescript
// src/types/config.ts (extend existing TanaConfig)
interface TanaConfig {
  // Existing
  apiToken?: string;
  apiEndpoint: string;  // Input API endpoint
  defaultTargetNode: string;

  // NEW: Local API configuration
  localApi?: {
    enabled: boolean;           // Default: true (prefer local when available)
    bearerToken?: string;       // Token from Tana Desktop > Settings > Local API
    endpoint: string;           // Default: "http://localhost:8262"
  };

  // NEW: Fallback behavior
  useInputApiFallback?: boolean;  // Default: false (error if local unavailable)
}
```

### API Response Types

```typescript
// src/types/local-api.ts (NEW)
interface LocalApiNode {
  id: string;
  name: string;
  props?: Record<string, unknown>;
}

interface LocalApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ImportTanaPasteResponse {
  nodes: Array<{ id: string; name: string }>;
}

interface TagOperationResponse {
  success: boolean;
  nodeId: string;
  tag: string;
  operation: 'added' | 'removed';
}

interface SetFieldResponse {
  success: boolean;
  nodeId: string;
  field: string;
  value: unknown;
}
```

## API Contracts

### Local API Client Interface

```typescript
// src/api/local-api-client.ts (NEW)
interface LocalApiClient {
  // Health check
  health(): Promise<boolean>;

  // Create operations (replaces Input API)
  importTanaPaste(content: string, targetNodeId?: string): Promise<ImportTanaPasteResponse>;

  // Mutation operations (NEW capabilities)
  addTag(nodeId: string, tagId: string): Promise<TagOperationResponse>;
  removeTag(nodeId: string, tagId: string): Promise<TagOperationResponse>;
  setFieldContent(nodeId: string, fieldId: string, value: string): Promise<SetFieldResponse>;
  setFieldOption(nodeId: string, fieldId: string, optionId: string): Promise<SetFieldResponse>;
  deleteNode?(nodeId: string): Promise<{ success: boolean }>;  // If API supports

  // Read operations (for future integration)
  getNode?(nodeId: string): Promise<LocalApiNode>;
  searchNodes?(query: object): Promise<LocalApiNode[]>;
}
```

### REST Endpoint Mapping (Verified from OpenAPI spec 2026-01-29)

| Operation | HTTP Method | Endpoint | Request Body | Notes |
|-----------|-------------|----------|--------------|-------|
| **Health** | GET | `/health` | - | No auth required |
| **List Workspaces** | GET | `/workspaces` | - | Returns id, name, homeNodeId |
| **Search Nodes** | GET | `/nodes/search?query={...}` | - | Powerful structured query DSL |
| **Read Node** | GET | `/nodes/{nodeId}` | - | Returns markdown, name, description |
| **Get Children** | GET | `/nodes/{nodeId}/children` | - | Paginated, limit/offset |
| **Import Tana Paste** | POST | `/nodes/{parentNodeId}/import` | `{ content }` | Creates nodes, returns IDs |
| **Update Node** | POST | `/nodes/{nodeId}/update` | `{ name?, description? }` | Update name and/or description |
| **Add/Remove Tags** | POST | `/nodes/{nodeId}/tags` | `{ action: "add"\|"remove", tagIds: [...] }` | Batch tag operations |
| **Set Field (text)** | POST | `/nodes/{nodeId}/fields/{attributeId}/content` | `{ content }` | Text, number, date fields |
| **Set Field (option)** | POST | `/nodes/{nodeId}/fields/{attributeId}/option` | `{ optionId }` | Dropdown/option fields |
| **Check/Uncheck** | POST | `/nodes/{nodeId}/done` | `{ done: true\|false }` | Mark as done/not done |
| **Trash Node** | POST | `/nodes/{nodeId}/trash` | `{}` | Move to trash (not permanent delete) |
| **List Tags** | GET | `/workspaces/{workspaceId}/tags` | - | Returns id, name, color |
| **Create Tag** | POST | `/workspaces/{workspaceId}/tags` | `{ name, description?, extendsTagIds?, showCheckbox? }` | Create new supertag |
| **Tag Schema** | GET | `/tags/{tagId}/schema` | - | Returns schema as markdown |
| **Add Field to Tag** | POST | `/tags/{tagId}/fields` | `{ name, dataType, ... }` | Add field definition |
| **Set Tag Checkbox** | POST | `/tags/{tagId}/checkbox` | `{ showCheckbox, doneStateMapping? }` | Configure done behavior |
| **Calendar Node** | GET | `/workspaces/{workspaceId}/calendar/node` | - | Get day/week/month/year node ID |

### Search Query DSL (Key Capabilities)

The `/nodes/search` endpoint supports a powerful query language:

```typescript
// Query structure
interface SearchQuery {
  and?: SearchCondition[];   // All must match
  or?: SearchCondition[];    // At least one must match
  not?: SearchCondition;     // Must NOT match

  // Conditions
  hasType?: string | { typeId: string; includeExtensions?: boolean };
  field?: { fieldId: string; stringValue?: string; numberValue?: number; state?: "defined"|"undefined"|"set"|"notSet" };
  compare?: { fieldId: string; operator: "gt"|"lt"|"eq"; value: string|number; type: "number"|"date"|"string" };
  textContains?: string;     // Case-insensitive substring
  textMatches?: string;      // Regex: /pattern/ or /pattern/i
  childOf?: { nodeIds: string[]; recursive?: boolean };
  linksTo?: string[];
  is?: "done"|"todo"|"template"|"field"|"entity"|"calendarNode"|"inLibrary";
  has?: "tag"|"field"|"media"|"audio"|"video"|"image";
  created?: { last: number };  // Days
  edited?: { last?: number; by?: string };
  done?: { last: number };
  onDate?: string | { date: string; fieldId?: string };
  overdue?: true;
  inLibrary?: true;
}
```

**This is MORE powerful than supertag-cli's current query language!**

## Implementation Phases

### Phase 1: Foundation (Backend Abstraction)

**Goal**: Create backend interface without breaking existing functionality

1. **T-1.1** [T] Create `TanaBackend` interface in `src/api/backend.ts`
2. **T-1.2** [T] Implement `InputApiBackend` wrapping existing `TanaApiClient`
3. **T-1.3** [T] Add backend selection logic in config manager
4. **T-1.4** [T] Update `node-builder.ts` to use backend interface

### Phase 2: Local API Client

**Goal**: Implement tana-local REST API client

1. **T-2.1** [T] Create `LocalApiClient` in `src/api/local-api-client.ts`
2. **T-2.2** [T] Implement health check with connection detection
3. **T-2.3** [T] Implement `importTanaPaste()` for node creation
4. **T-2.4** [T] Implement tag mutation methods
5. **T-2.5** [T] Implement field mutation methods
6. **T-2.6** [T] Add Zod schemas for request/response validation

### Phase 3: Configuration

**Goal**: Add bearer token config and backend selection

1. **T-3.1** [T] Extend `TanaConfig` type with localApi settings
2. **T-3.2** [T] Add `config --bearer-token` command
3. **T-3.3** [T] Add `config --local-api-url` command
4. **T-3.4** [T] Add `config --use-input-api` fallback option
5. **T-3.5** [T] Environment variable support: `TANA_LOCAL_API_TOKEN`

### Phase 4: CLI Commands

**Goal**: Add new mutation commands

1. **T-4.1** [T] Add `supertag update <id> --name --description` command
2. **T-4.2** [T] Add `supertag tag add <id> <tag>` command
3. **T-4.3** [T] Add `supertag tag remove <id> <tag>` command
4. **T-4.4** [T] Add `supertag set-field <id> <field> <value>` command
5. **T-4.5** [T] Add `supertag trash <id>` command (move to trash, not delete)
6. **T-4.6** [T] Add `supertag done <id>` and `supertag undone <id>` commands
7. **T-4.7** [T] Update `create` to return node ID
8. **T-4.8** [T] Add `supertag tag create <name>` command (create new supertag)

### Phase 5: MCP Tools

**Goal**: Update MCP server to use local API

1. **T-5.1** [T] Update `tana_create_node` tool to use backend
2. **T-5.2** [T] Update `tana_batch_create` tool to use backend
3. **T-5.3** [T] Add `tana_update_node` tool
4. **T-5.4** [T] Add `tana_add_tag` / `tana_remove_tag` tools
5. **T-5.5** [T] Add `tana_set_field` tool (text/number/date)
6. **T-5.6** [T] Add `tana_set_field_option` tool (dropdown)
7. **T-5.7** [T] Add `tana_trash_node` tool
8. **T-5.8** [T] Add `tana_done` / `tana_undone` tools
9. **T-5.9** [T] Add `tana_create_tag` tool

### Phase 6: Documentation

**Goal**: Update all documentation

1. **T-6.1** Update README.md with new commands
2. **T-6.2** Update CHANGELOG.md
3. **T-6.3** Update SKILL.md (PAI skill documentation)
4. **T-6.4** Update MCP documentation

## File Structure

```
src/
├── api/
│   ├── client.ts             # Existing Input API client
│   ├── backend.ts            # NEW: Backend interface
│   ├── input-api-backend.ts  # NEW: Input API wrapper
│   └── local-api-client.ts   # NEW: Local API client (REST)
├── commands/
│   ├── create.ts             # MODIFIED: Use backend
│   ├── update.ts             # NEW: Update name/description
│   ├── tag.ts                # NEW: Tag add/remove + create supertag
│   ├── set-field.ts          # NEW: Set field value (content or option)
│   ├── trash.ts              # NEW: Move to trash
│   └── done.ts               # NEW: Done/undone commands
├── services/
│   └── node-builder.ts       # MODIFIED: Support mutations
├── mcp/tools/
│   ├── create.ts             # MODIFIED: Use backend
│   ├── batch-create.ts       # MODIFIED: Use backend
│   ├── update.ts             # NEW: Update tool
│   ├── tag-operations.ts     # NEW: Add/remove/create tag tools
│   ├── set-field.ts          # NEW: Set field tools (content + option)
│   ├── trash.ts              # NEW: Trash tool
│   └── done.ts               # NEW: Done/undone tools
├── config/
│   └── manager.ts            # MODIFIED: Local API config
├── types/
│   ├── config.ts             # MODIFIED: LocalApi types
│   └── local-api.ts          # NEW: Local API types + Zod schemas
└── tests/
    └── contracts/            # NEW: Contract tests
        ├── local-api.test.ts
        ├── openapi-schemas.ts  # Zod schemas from OpenAPI
        └── openapi-validation.test.ts
```

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API instability (beta) | High | Medium | Feature flag, Input API fallback |
| Breaking changes | Medium | High | Semantic versioning, migration guide |
| Token expiration | Medium | Low | Interactive prompt, clear errors |
| Network failures | Low | Medium | Retry logic, partial success reporting |
| Endpoint changes | Medium | Medium | Contract tests detect drift |

## Failure Mode Analysis

### How It Fails

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Tana Desktop not running | Connection refused on health check | Clear error with instructions |
| Invalid bearer token | 401 Unauthorized | Interactive prompt for new token |
| Node not found (update/delete) | 404 Not Found | Report specific node ID not found |
| Rate limiting | 429 Too Many Requests | Exponential backoff, queue operations |
| API version mismatch | Schema validation failure | Log warning, attempt operation |

### Blast Radius

- **Scope**: Only affects write operations
- **Read operations**: Unchanged (still use export-based SQLite)
- **Semantic search**: Unchanged
- **Analytics**: Unchanged

### Assumption Fragility

| Assumption | If Wrong | Recovery Plan |
|------------|----------|---------------|
| API is stable | May need rapid patches | Feature flag to disable |
| Endpoints match spec | Operations fail | Contract tests catch early |
| Token doesn't expire frequently | UX friction | Cache refresh mechanism |

## Longevity Assessment

### Maintainability

- **Backend abstraction**: Allows swapping implementations
- **Contract tests**: Detect API drift automatically
- **Config-driven**: No code changes for URL changes

### Evolution Vectors

1. **Server API**: Config already supports custom endpoint URL
2. **Read operations**: Architecture supports adding tana-local reads
3. **Additional mutations**: Interface extensible for new operations

### Deletion Criteria

This feature could be removed if:
- Tana deprecates Local API
- Better official tooling emerges
- Maintenance burden exceeds value

## Debt Score

| Factor | Score | Notes |
|--------|-------|-------|
| Complexity | 3/5 | New abstraction layer, but well-bounded |
| Test Coverage | 4/5 | Contract tests provide good coverage |
| Documentation | 4/5 | Comprehensive updates planned |
| Dependencies | 2/5 | External API dependency |
| **Total** | **3.25/5** | Acceptable for the value delivered |

## Dependencies

- **External**: tana-local REST API (http://localhost:8262)
- **Internal**: F-073 (error handling), existing config system
- **Blocked by**: None
- **Blocks**: Future read operation integration

## Complexity Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Foundation | 2h | Low |
| Phase 2: Local API Client | 3h | Medium |
| Phase 3: Configuration | 1h | Low |
| Phase 4: CLI Commands | 3h | Low |
| Phase 5: MCP Tools | 2h | Low |
| Phase 6: Documentation | 1h | Low |
| **Total** | **12h** | Medium |

## Open Questions (Resolved 2026-01-29)

| Question | Answer |
|----------|--------|
| Exact API endpoints | ✅ Verified from OpenAPI spec - see endpoint mapping above |
| Delete support | ✅ **Trash only** - POST /nodes/{id}/trash moves to trash (not permanent delete) |
| Batch mutations | ✅ **Yes** - Tag operations support array of tagIds |
| Search API complexity | ✅ **Very powerful** - supports and/or/not, regex, field filters, date ranges, overdue, etc. |

## Additional Findings

### Search API Opportunity

The Local API search (`GET /nodes/search`) is **more powerful** than supertag-cli's current query DSL:
- Supports regex matching (`textMatches`)
- Complex boolean logic (and/or/not nesting)
- Field comparisons (gt/lt/eq)
- Date-relative queries (created/edited in last N days)
- Overdue detection
- Reference traversal (linksTo, childOf)

**Future opportunity**: Consider implementing a `--live` mode for `supertag query` that uses the Local API for real-time results instead of the export-based SQLite index.

### Calendar Node Access

The API provides calendar node ID lookup:
- `GET /workspaces/{ws}/calendar/node?granularity=day&date=2026-01-29`
- Returns the node ID for any day/week/month/year

This enables adding items directly to calendar dates.

---
*Plan created: 2026-01-29*
*Spec reference: F-094-tana-local-api-integration/spec.md*
