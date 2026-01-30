# Implementation Tasks: F-094 tana-local API Integration

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| **Group 1: Types & Configuration** | | |
| T-1.1 | ☐ | Local API types + Zod schemas |
| T-1.2 | ☐ | Extend TanaConfig with localApi |
| T-1.3 | ☐ | Config manager: bearer token + local API URL |
| T-1.4 | ☐ | Config CLI commands |
| **Group 2: API Client** | | |
| T-2.1 | ☐ | Local API client core |
| T-2.2 | ☐ | Health check + connection detection |
| T-2.3 | ☐ | Import Tana Paste (create nodes) |
| T-2.4 | ☐ | Tag mutation methods |
| T-2.5 | ☐ | Field mutation methods |
| T-2.6 | ☐ | Node update, done/undone, trash |
| T-2.7 | ☐ | Tag creation + schema methods |
| T-2.8 | ☐ | Contract tests against OpenAPI |
| **Group 3: Backend Abstraction** | | |
| T-3.1 | ☐ | TanaBackend interface |
| T-3.2 | ☐ | InputApiBackend wrapper |
| T-3.3 | ☐ | LocalApiBackend implementation |
| T-3.4 | ☐ | Backend selection logic |
| **Group 4: CLI Commands** | | |
| T-4.1 | ☐ | Switch create command to backend |
| T-4.2 | ☐ | Switch batch create to backend |
| T-4.3 | ☐ | New: update command |
| T-4.4 | ☐ | New: tag add/remove commands |
| T-4.5 | ☐ | New: tag create command |
| T-4.6 | ☐ | New: set-field command |
| T-4.7 | ☐ | New: trash command |
| T-4.8 | ☐ | New: done/undone commands |
| **Group 5: MCP Tools** | | |
| T-5.1 | ☐ | Switch tana_create_node to backend |
| T-5.2 | ☐ | Switch tana_batch_create to backend |
| T-5.3 | ☐ | New: tana_update_node tool |
| T-5.4 | ☐ | New: tana_tag_add / tana_tag_remove |
| T-5.5 | ☐ | New: tana_create_tag tool |
| T-5.6 | ☐ | New: tana_set_field / tana_set_field_option |
| T-5.7 | ☐ | New: tana_trash_node tool |
| T-5.8 | ☐ | New: tana_done / tana_undone tools |
| T-5.9 | ☐ | MCP schema + registry updates |
| **Group 6: Documentation** | | |
| T-6.1 | ☐ | README.md |
| T-6.2 | ☐ | CHANGELOG.md |
| T-6.3 | ☐ | SKILL.md |

---

## Group 1: Types & Configuration

### T-1.1: Create Local API types and Zod schemas [T]
- **File:** `src/types/local-api.ts` (NEW)
- **Test:** `tests/unit/local-api-types.test.ts` (NEW)
- **Dependencies:** none
- **Description:** Define TypeScript types and Zod validation schemas for all tana-local API interactions. These types ground every subsequent task.
- **Acceptance:**
  - Zod schemas for all REST responses: `ImportResponse`, `TagOperationResponse`, `FieldResponse`, `TrashResponse`, `DoneResponse`, `UpdateResponse`
  - Zod schemas for request bodies: `ImportRequest`, `TagRequest`, `FieldContentRequest`, `FieldOptionRequest`, `UpdateRequest`, `DoneRequest`
  - Export `LocalApiConfig` type with `enabled`, `bearerToken`, `endpoint` fields
  - All schemas validate against OpenAPI spec shapes (see `openapi.json` in spec dir)
  - Tests confirm schema parsing for valid data and rejection of invalid data

### T-1.2: Extend TanaConfig with localApi settings [T]
- **File:** `src/types.ts` (MODIFY — add `localApi?: LocalApiConfig` to `TanaConfig`)
- **Test:** `tests/unit/config-types.test.ts` (NEW)
- **Dependencies:** T-1.1
- **Description:** Add `localApi` optional field to the existing `TanaConfig` interface and `useInputApiFallback` boolean. Ensure backward compatibility — configs without `localApi` must still load.
- **Acceptance:**
  - `TanaConfig.localApi` is optional with type `LocalApiConfig`
  - `TanaConfig.useInputApiFallback` is optional boolean (default: false)
  - Existing configs without `localApi` still parse correctly
  - Tests verify both old and new config shapes

### T-1.3: Config manager reads bearer token and local API URL [T]
- **File:** `src/config/manager.ts` (MODIFY)
- **Test:** `tests/unit/config-manager-local-api.test.ts` (NEW)
- **Dependencies:** T-1.2
- **Description:** Extend `ConfigManager` to:
  1. Read `localApi.bearerToken` from config file
  2. Read `localApi.endpoint` from config file (default: `http://localhost:8262`)
  3. Support `TANA_LOCAL_API_TOKEN` environment variable (overrides config)
  4. Support `TANA_LOCAL_API_URL` environment variable (overrides config)
  5. Provide `getLocalApiConfig()` accessor returning resolved `LocalApiConfig`
- **Acceptance:**
  - `getLocalApiConfig()` returns merged config (env vars > file > defaults)
  - Default endpoint is `http://localhost:8262`
  - `TANA_LOCAL_API_TOKEN` env var takes precedence over config file
  - Tests cover all precedence scenarios

### T-1.4: Config CLI commands for bearer token and local API [T]
- **File:** `src/commands/config.ts` (MODIFY)
- **Test:** `tests/commands/config-local-api.test.ts` (NEW)
- **Dependencies:** T-1.3
- **Description:** Add CLI flags to the existing `config` command:
  - `supertag config --bearer-token <token>` — stores in `localApi.bearerToken`
  - `supertag config --local-api-url <url>` — stores in `localApi.endpoint`
  - `supertag config --use-input-api <true|false>` — stores in `useInputApiFallback`
  - Display local API settings in `supertag config --show`
- **Acceptance:**
  - All three flags write to config.json correctly
  - `--show` displays local API configuration
  - Tests verify config persistence round-trip

---

## Group 2: Local API Client

### T-2.1: Local API client core with auth and error handling [T]
- **File:** `src/api/local-api-client.ts` (NEW)
- **Test:** `tests/api/local-api-client.test.ts` (NEW)
- **Dependencies:** T-1.1
- **Description:** Create `LocalApiClient` class with:
  1. Constructor taking `endpoint` and `bearerToken`
  2. Shared `request()` method handling: Bearer auth header, JSON body, response parsing, Zod validation
  3. Error handling: connection refused → `StructuredError("LOCAL_API_UNAVAILABLE")`, 401 → `StructuredError("AUTH_EXPIRED")`, 404 → `StructuredError("NODE_NOT_FOUND")`
  4. Retry logic: exponential backoff, max 3 attempts for transient failures
- **Acceptance:**
  - `new LocalApiClient({ endpoint, bearerToken })` creates client
  - All requests include `Authorization: Bearer <token>` header
  - Connection refused produces clear error with recovery suggestion
  - 401 responses produce auth expired error
  - Tests mock fetch to verify all error paths

### T-2.2: Health check and connection detection [T]
- **File:** `src/api/local-api-client.ts` (MODIFY — add `health()` method)
- **Test:** `tests/api/local-api-client.test.ts` (MODIFY — add health tests)
- **Dependencies:** T-2.1
- **Description:** Add `health()` method that:
  1. Calls `GET /health` (no auth required per OpenAPI spec)
  2. Returns `true` if 200 OK, `false` otherwise
  3. Used by backend selection to auto-detect tana-local availability
- **Acceptance:**
  - `client.health()` returns boolean
  - Returns `false` on connection refused (no throw)
  - Returns `false` on non-200 response
  - Tests cover success, connection refused, timeout

### T-2.3: Import Tana Paste method (node creation) [T]
- **File:** `src/api/local-api-client.ts` (MODIFY — add `importTanaPaste()`)
- **Test:** `tests/api/local-api-client.test.ts` (MODIFY)
- **Dependencies:** T-2.1
- **Description:** Add `importTanaPaste(parentNodeId, content)` method:
  1. `POST /nodes/{parentNodeId}/import` with `{ content }` body
  2. Parse response with Zod schema
  3. Return `{ nodes: [{ id, name }] }` on success
- **Acceptance:**
  - Creates nodes via Tana Paste format
  - Returns created node IDs
  - Validates response against Zod schema
  - Tests mock successful creation and error responses

### T-2.4: Tag mutation methods [T]
- **File:** `src/api/local-api-client.ts` (MODIFY — add tag methods)
- **Test:** `tests/api/local-api-client.test.ts` (MODIFY)
- **Dependencies:** T-2.1
- **Description:** Add tag methods:
  1. `addTags(nodeId, tagIds[])` — `POST /nodes/{nodeId}/tags` with `{ action: "add", tagIds }`
  2. `removeTags(nodeId, tagIds[])` — `POST /nodes/{nodeId}/tags` with `{ action: "remove", tagIds }`
  3. Both return operation result per tag
- **Acceptance:**
  - `addTags()` sends correct payload with action "add"
  - `removeTags()` sends correct payload with action "remove"
  - Supports batch (multiple tagIds in single call)
  - Tests cover success and node-not-found error

### T-2.5: Field mutation methods [T]
- **File:** `src/api/local-api-client.ts` (MODIFY — add field methods)
- **Test:** `tests/api/local-api-client.test.ts` (MODIFY)
- **Dependencies:** T-2.1
- **Description:** Add field methods:
  1. `setFieldContent(nodeId, attributeId, content)` — `POST /nodes/{nodeId}/fields/{attributeId}/content` with `{ content }`
  2. `setFieldOption(nodeId, attributeId, optionId)` — `POST /nodes/{nodeId}/fields/{attributeId}/option` with `{ optionId }`
- **Acceptance:**
  - `setFieldContent()` sets text/number/date/url/email fields
  - `setFieldOption()` sets option/dropdown fields
  - Tests cover both endpoints

### T-2.6: Node update, done/undone, and trash methods [T]
- **File:** `src/api/local-api-client.ts` (MODIFY — add remaining mutation methods)
- **Test:** `tests/api/local-api-client.test.ts` (MODIFY)
- **Dependencies:** T-2.1
- **Description:** Add remaining mutation methods:
  1. `updateNode(nodeId, { name?, description? })` — `POST /nodes/{nodeId}/update` with edit payload (uses `old_string`/`new_string` search-and-replace per OpenAPI)
  2. `checkNode(nodeId)` — `POST /nodes/{nodeId}/done` (mark done)
  3. `uncheckNode(nodeId)` — `POST /nodes/{nodeId}/done` with `{ done: false }` (uncheck)
  4. `trashNode(nodeId)` — `POST /nodes/{nodeId}/trash`
- **Acceptance:**
  - `updateNode()` supports name and/or description updates
  - `checkNode()` / `uncheckNode()` toggle done state
  - `trashNode()` moves node to trash
  - All methods return confirmation responses
  - Tests cover success and error paths

### T-2.7: Tag creation and schema methods [T]
- **File:** `src/api/local-api-client.ts` (MODIFY — add tag management methods)
- **Test:** `tests/api/local-api-client.test.ts` (MODIFY)
- **Dependencies:** T-2.1
- **Description:** Add tag management methods:
  1. `createTag(workspaceId, { name, description?, extendsTagIds?, showCheckbox? })` — `POST /workspaces/{workspaceId}/tags`
  2. `getTagSchema(tagId)` — `GET /tags/{tagId}/schema` (returns markdown-formatted schema)
  3. `listTags(workspaceId, limit?)` — `GET /workspaces/{workspaceId}/tags`
  4. `listWorkspaces()` — `GET /workspaces`
- **Acceptance:**
  - `createTag()` creates supertag and returns `{ id, name }`
  - `getTagSchema()` returns schema definition
  - `listTags()` returns array of `{ id, name, color }`
  - `listWorkspaces()` returns workspace list
  - Tests cover all methods

### T-2.8: Contract tests against OpenAPI spec [T]
- **File:** `tests/contracts/local-api-contract.test.ts` (NEW)
- **Test:** Self-contained contract tests
- **Dependencies:** T-2.1, T-2.3, T-2.4, T-2.5, T-2.6, T-2.7
- **Description:** Validate all Zod schemas and request/response shapes against the OpenAPI spec at `.specify/specs/F-094-tana-local-api-integration/openapi.json`. No live server required.
- **Acceptance:**
  - Every endpoint in the client has a corresponding contract test
  - Request body shapes match OpenAPI spec definitions
  - Response schemas accept valid OpenAPI response examples
  - Tests run without a live tana-local server

---

## Group 3: Backend Abstraction

### T-3.1: Define TanaBackend interface [T]
- **File:** `src/api/backend.ts` (NEW)
- **Test:** `tests/api/backend.test.ts` (NEW)
- **Dependencies:** T-1.1
- **Description:** Create `TanaBackend` interface that abstracts over Input API and Local API:
  ```typescript
  interface TanaBackend {
    readonly type: 'input-api' | 'local-api';
    createNodes(targetNodeId: string, nodes: TanaApiNode[], verbose?: boolean): Promise<TanaApiResponse>;
    // Mutation operations (only local-api supports these)
    supportsMutations(): boolean;
    updateNode?(nodeId: string, update: NodeUpdate): Promise<UpdateResponse>;
    addTags?(nodeId: string, tagIds: string[]): Promise<void>;
    removeTags?(nodeId: string, tagIds: string[]): Promise<void>;
    setFieldContent?(nodeId: string, attributeId: string, content: string): Promise<void>;
    setFieldOption?(nodeId: string, attributeId: string, optionId: string): Promise<void>;
    trashNode?(nodeId: string): Promise<void>;
    checkNode?(nodeId: string): Promise<void>;
    uncheckNode?(nodeId: string): Promise<void>;
  }
  ```
  Also export `BackendCapability` type for runtime capability checking.
- **Acceptance:**
  - Interface defines all operations from spec
  - `supportsMutations()` method for capability detection
  - Optional methods for mutation-only operations
  - Type tests verify interface compliance

### T-3.2: Implement InputApiBackend [T]
- **File:** `src/api/input-api-backend.ts` (NEW)
- **Test:** `tests/api/input-api-backend.test.ts` (NEW)
- **Dependencies:** T-3.1
- **Description:** Wrap existing `TanaApiClient` as a `TanaBackend` implementation:
  1. `type: 'input-api'`
  2. `createNodes()` delegates to `TanaApiClient.postNodes()`
  3. `supportsMutations()` returns `false`
  4. All mutation methods throw `StructuredError("MUTATIONS_NOT_SUPPORTED")` with suggestion to configure local API
- **Acceptance:**
  - Implements `TanaBackend` interface
  - `createNodes()` works identically to current behavior
  - Mutation methods throw descriptive errors
  - Existing create flow is not broken

### T-3.3: Implement LocalApiBackend [T]
- **File:** `src/api/local-api-backend.ts` (NEW)
- **Test:** `tests/api/local-api-backend.test.ts` (NEW)
- **Dependencies:** T-3.1, T-2.1 through T-2.7
- **Description:** Implement `TanaBackend` using `LocalApiClient`:
  1. `type: 'local-api'`
  2. `createNodes()` converts `TanaApiNode[]` to Tana Paste and calls `importTanaPaste()`
  3. `supportsMutations()` returns `true`
  4. All mutation methods delegate to corresponding `LocalApiClient` methods
- **Acceptance:**
  - Implements `TanaBackend` interface fully
  - `createNodes()` converts Input API format to Tana Paste format for import
  - All mutation methods work correctly
  - Tests verify delegation to `LocalApiClient`

### T-3.4: Backend selection and resolution logic [T]
- **File:** `src/api/backend-resolver.ts` (NEW)
- **Test:** `tests/api/backend-resolver.test.ts` (NEW)
- **Dependencies:** T-3.2, T-3.3, T-1.3
- **Description:** Create `resolveBackend()` function that:
  1. Reads `localApi` config from ConfigManager
  2. If `localApi.enabled` and `bearerToken` is set → try LocalApiBackend
  3. If local API health check fails and `useInputApiFallback` is true → fall back to InputApiBackend
  4. If local API health check fails and no fallback → throw `StructuredError("LOCAL_API_UNAVAILABLE")`
  5. If `useInputApiFallback` is explicitly true → use InputApiBackend directly
  6. Cache resolved backend for session (avoid repeated health checks)
- **Acceptance:**
  - Auto-selects local API when configured and available
  - Falls back to Input API when configured
  - Clear error when local API unavailable and no fallback
  - Tests cover all selection paths

---

## Group 4: CLI Commands

### T-4.1: Switch create command to backend abstraction [T]
- **File:** `src/commands/create.ts` (MODIFY), `src/services/node-builder.ts` (MODIFY)
- **Test:** `tests/commands/create-backend.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Modify `createNode()` in node-builder to use `resolveBackend()` instead of directly calling `createApiClient()`. The create command interface stays identical — only the underlying transport changes.
- **Acceptance:**
  - `supertag create` works identically with both backends
  - Returns node ID when local API backend is used
  - Falls back to Input API when configured
  - Existing create tests still pass
  - New tests verify backend delegation

### T-4.2: Switch batch create to backend abstraction [T]
- **File:** `src/commands/batch.ts` (MODIFY), `src/services/batch-operations.ts` (MODIFY)
- **Test:** `tests/commands/batch-backend.test.ts` (NEW)
- **Dependencies:** T-4.1
- **Description:** Update batch create to use backend abstraction. Add partial success reporting for local API batch operations.
- **Acceptance:**
  - `supertag batch create` works with both backends
  - Reports per-node success/failure for local API
  - Existing batch tests still pass

### T-4.3: New update command [T]
- **File:** `src/commands/update.ts` (NEW or MODIFY if exists)
- **Test:** `tests/commands/update.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add `supertag update <nodeId>` command:
  - `--name <new-name>` — update node name
  - `--description <text>` — update node description
  - Requires local API backend (throws if only Input API)
  - Note: tana-local update uses search-and-replace semantics (old_string → new_string). For initial implementation, use empty string as old_string for "set" operations, or fetch current value first for replace.
- **Acceptance:**
  - `supertag update <id> --name "New name"` updates node name
  - `supertag update <id> --description "New desc"` updates description
  - Both flags can be used together
  - Error when local API not available
  - Tests verify command parsing and backend call

### T-4.4: New tag add/remove commands [T]
- **File:** `src/commands/tag.ts` (MODIFY — add `add` and `remove` subcommands)
- **Test:** `tests/commands/tag-mutations.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add tag mutation subcommands to existing `tag` command group:
  - `supertag tag add <nodeId> <tagName>` — resolve tag name to ID via DB, call `addTags()`
  - `supertag tag remove <nodeId> <tagName>` — resolve tag name to ID, call `removeTags()`
  - Support `--tag-id <id>` flag to bypass name resolution
  - Requires local API backend
- **Acceptance:**
  - `supertag tag add <nodeId> "priority"` adds tag by name
  - `supertag tag remove <nodeId> "draft"` removes tag by name
  - `--tag-id` flag bypasses DB lookup
  - Error when local API not available
  - Tests verify name resolution and API call

### T-4.5: New tag create command [T]
- **File:** `src/commands/tag.ts` (MODIFY — add `create` subcommand)
- **Test:** `tests/commands/tag-create.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add tag creation subcommand:
  - `supertag tag create <name>` — create new supertag
  - `--description <text>` — optional description
  - `--extends <tagName>` — extend existing tag
  - `--checkbox` — enable done checkbox
  - Uses workspace from config or `--workspace` flag
- **Acceptance:**
  - `supertag tag create "Priority"` creates supertag
  - Returns created tag ID
  - `--extends` resolves tag name to ID
  - `--checkbox` enables done checkbox
  - Tests verify creation flow

### T-4.6: New set-field command [T]
- **File:** `src/commands/set-field.ts` (NEW)
- **Test:** `tests/commands/set-field.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add `supertag set-field <nodeId> <fieldName> <value>` command:
  - Resolves field name to attribute ID via DB schema
  - Detects field type: if option field → use `setFieldOption()`, else → use `setFieldContent()`
  - `--field-id <id>` flag to bypass name resolution
  - `--option-id <id>` flag to set option field explicitly
  - Requires local API backend
- **Acceptance:**
  - `supertag set-field <id> "Status" "Complete"` sets text field
  - `supertag set-field <id> "Status" "Done" --option-id <oid>` sets option field
  - Auto-detects field type when possible
  - Error when local API not available
  - Tests verify field resolution and both API paths

### T-4.7: New trash command [T]
- **File:** `src/commands/trash.ts` (NEW)
- **Test:** `tests/commands/trash.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add `supertag trash <nodeId>` command:
  - Moves node to Tana trash (not permanent delete)
  - `--confirm` flag to skip confirmation prompt
  - Without `--confirm`, prompts "Are you sure?"
  - Requires local API backend
- **Acceptance:**
  - `supertag trash <id> --confirm` moves to trash
  - Without `--confirm`, prompts for confirmation
  - Returns confirmation message
  - Error when local API not available
  - Tests verify confirmation flow and API call

### T-4.8: New done/undone commands [T]
- **File:** `src/commands/done.ts` (NEW)
- **Test:** `tests/commands/done.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add done/undone commands:
  - `supertag done <nodeId>` — marks node as done (check checkbox)
  - `supertag undone <nodeId>` — marks node as not done (uncheck)
  - Requires local API backend
- **Acceptance:**
  - `supertag done <id>` checks the node's checkbox
  - `supertag undone <id>` unchecks the node's checkbox
  - Returns confirmation message with node name
  - Tests verify both operations

---

## Group 5: MCP Tools

### T-5.1: Switch tana_create_node tool to backend [T]
- **File:** `src/mcp/tools/create.ts` (MODIFY)
- **Test:** `src/mcp/tools/__tests__/create-backend.test.ts` (NEW)
- **Dependencies:** T-4.1 (backend already integrated in node-builder)
- **Description:** Update MCP create tool to use backend-aware `createNode()`. The tool interface stays the same; only the underlying transport changes.
- **Acceptance:**
  - Tool works with both backends
  - Returns node ID when local API used
  - Existing create tool behavior preserved

### T-5.2: Switch tana_batch_create tool to backend [T]
- **File:** `src/mcp/tools/batch-create.ts` (MODIFY)
- **Test:** `src/mcp/tools/__tests__/batch-backend.test.ts` (NEW)
- **Dependencies:** T-4.2
- **Description:** Update MCP batch create tool to use backend abstraction.
- **Acceptance:**
  - Tool works with both backends
  - Reports partial success/failure

### T-5.3: New tana_update_node MCP tool [T]
- **File:** `src/mcp/tools/update.ts` (NEW)
- **Test:** `src/mcp/tools/__tests__/update.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add MCP tool `tana_update_node`:
  - Input: `{ nodeId, name?, description? }`
  - Calls `backend.updateNode()`
  - Returns confirmation text
- **Acceptance:**
  - Tool registered in MCP server
  - Accepts nodeId + optional name/description
  - Returns formatted confirmation
  - Tests verify schema and handler

### T-5.4: New tana_tag_add / tana_tag_remove MCP tools [T]
- **File:** `src/mcp/tools/tag-operations.ts` (NEW)
- **Test:** `src/mcp/tools/__tests__/tag-operations.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add MCP tools:
  - `tana_tag_add`: Input `{ nodeId, tagIds }` → calls `backend.addTags()`
  - `tana_tag_remove`: Input `{ nodeId, tagIds }` → calls `backend.removeTags()`
- **Acceptance:**
  - Both tools registered in MCP server
  - Support batch tag operations (array of tagIds)
  - Tests verify schemas and handlers

### T-5.5: New tana_create_tag MCP tool [T]
- **File:** `src/mcp/tools/tag-create.ts` (NEW)
- **Test:** `src/mcp/tools/__tests__/tag-create.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add MCP tool `tana_create_tag`:
  - Input: `{ workspaceId, name, description?, extendsTagIds?, showCheckbox? }`
  - Calls local API `createTag()` method
  - Returns created tag ID and name
- **Acceptance:**
  - Tool registered in MCP server
  - Creates supertag with optional extends and checkbox
  - Tests verify schema and handler

### T-5.6: New tana_set_field / tana_set_field_option MCP tools [T]
- **File:** `src/mcp/tools/set-field.ts` (NEW)
- **Test:** `src/mcp/tools/__tests__/set-field.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add MCP tools:
  - `tana_set_field`: Input `{ nodeId, attributeId, content }` → text/number/date fields
  - `tana_set_field_option`: Input `{ nodeId, attributeId, optionId }` → option/dropdown fields
- **Acceptance:**
  - Both tools registered in MCP server
  - `tana_set_field` handles text, number, date, url, email fields
  - `tana_set_field_option` handles option/dropdown fields
  - Tests verify schemas and handlers

### T-5.7: New tana_trash_node MCP tool [T]
- **File:** `src/mcp/tools/trash.ts` (NEW)
- **Test:** `src/mcp/tools/__tests__/trash.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add MCP tool `tana_trash_node`:
  - Input: `{ nodeId }`
  - Calls `backend.trashNode()`
  - Returns confirmation
- **Acceptance:**
  - Tool registered in MCP server
  - Moves node to trash (not permanent delete)
  - Tests verify schema and handler

### T-5.8: New tana_done / tana_undone MCP tools [T]
- **File:** `src/mcp/tools/done.ts` (NEW)
- **Test:** `src/mcp/tools/__tests__/done.test.ts` (NEW)
- **Dependencies:** T-3.4
- **Description:** Add MCP tools:
  - `tana_done`: Input `{ nodeId }` → marks as done
  - `tana_undone`: Input `{ nodeId }` → marks as not done
- **Acceptance:**
  - Both tools registered in MCP server
  - Toggle done/undone state
  - Tests verify schemas and handlers

### T-5.9: MCP schema registration and tool registry update [T]
- **File:** `src/mcp/schemas.ts` (MODIFY), `src/mcp/tool-registry.ts` (MODIFY), `src/mcp/index.ts` (MODIFY)
- **Test:** `tests/mcp/tool-registry.test.ts` (MODIFY)
- **Dependencies:** T-5.3 through T-5.8
- **Description:** Register all new tools in the MCP server:
  1. Add Zod schemas for all new tool inputs in `schemas.ts`
  2. Add tool metadata entries in `tool-registry.ts` under `'mutate'` category
  3. Register tool handlers in `index.ts` `CallToolRequestSchema` handler
  4. Update tool count and category documentation
- **Acceptance:**
  - All new tools appear in MCP tool listing
  - Tools are categorized under `'mutate'` category
  - Schema validation works for all tool inputs
  - Registry test updated with correct tool count

---

## Group 6: Documentation

### T-6.1: Update README.md
- **File:** `README.md` (MODIFY)
- **Dependencies:** T-4.1 through T-4.8, T-5.1 through T-5.9
- **Description:** Add documentation for:
  - Local API configuration (bearer token, endpoint, fallback)
  - New CLI commands: update, tag add/remove, tag create, set-field, trash, done/undone
  - New MCP tools listing
  - tana-local prerequisites (Tana Desktop running)

### T-6.2: Update CHANGELOG.md
- **File:** `CHANGELOG.md` (MODIFY)
- **Dependencies:** T-6.1
- **Description:** Add `[Unreleased]` section documenting:
  - tana-local API integration (major feature)
  - New commands: update, tag add/remove/create, set-field, trash, done/undone
  - Backend abstraction (Input API fallback)
  - New MCP tools
  - Configuration additions

### T-6.3: Update SKILL.md
- **File:** `SKILL.md` (MODIFY)
- **Dependencies:** T-6.1
- **Description:** Update PAI skill documentation:
  - Add new USE WHEN triggers for mutation commands
  - Update command reference table
  - Add MCP tools reference
  - Add local API configuration instructions

---

## Execution Order

```
Phase 1 (Foundation):
  T-1.1 → T-1.2 → T-1.3 → T-1.4
  T-3.1 (parallel with T-1.2+)

Phase 2 (API Client + Backend):
  T-2.1 → T-2.2, T-2.3, T-2.4, T-2.5, T-2.6, T-2.7 (parallel after T-2.1)
  T-2.8 (after all T-2.x)
  T-3.2 (parallel with T-2.x, depends on T-3.1)
  T-3.3 (after T-3.1 + T-2.x)
  T-3.4 (after T-3.2 + T-3.3)

Phase 3 (CLI Commands):
  T-4.1 → T-4.2 (sequential, foundation for other commands)
  T-4.3, T-4.4, T-4.5, T-4.6, T-4.7, T-4.8 (parallel after T-4.1)

Phase 4 (MCP Tools):
  T-5.1, T-5.2 (parallel, after T-4.1/T-4.2)
  T-5.3, T-5.4, T-5.5, T-5.6, T-5.7, T-5.8 (parallel after T-3.4)
  T-5.9 (after all T-5.x)

Phase 5 (Documentation):
  T-6.1 → T-6.2, T-6.3 (parallel after T-6.1)
```

## Dependency Graph

```
T-1.1 ─┬─→ T-1.2 → T-1.3 → T-1.4
       │
       ├─→ T-2.1 ─┬─→ T-2.2 ─┐
       │          ├─→ T-2.3 ─┤
       │          ├─→ T-2.4 ─┤
       │          ├─→ T-2.5 ─┼─→ T-2.8
       │          ├─→ T-2.6 ─┤
       │          └─→ T-2.7 ─┘
       │
       └─→ T-3.1 ─┬─→ T-3.2 ─┬─→ T-3.4 ──→ T-4.1 ─┬─→ T-4.2
                  │          │                      ├─→ T-4.3 ─┐
                  └─→ T-3.3 ─┘                      ├─→ T-4.4 ─┤
                       ↑                             ├─→ T-4.5 ─┤
                    (T-2.x)                          ├─→ T-4.6 ─┤
                                                     ├─→ T-4.7 ─┤
                                                     └─→ T-4.8 ─┤
                                                                 │
T-4.1 ──→ T-5.1 ─┐                                              │
T-4.2 ──→ T-5.2 ─┤                                              │
T-3.4 ──→ T-5.3 ─┤                                              │
T-3.4 ──→ T-5.4 ─┤                                              ├─→ T-6.1 ─┬─→ T-6.2
T-3.4 ──→ T-5.5 ─┼─→ T-5.9                                     │          └─→ T-6.3
T-3.4 ──→ T-5.6 ─┤                                              │
T-3.4 ──→ T-5.7 ─┤                                              │
T-3.4 ──→ T-5.8 ─┘                                              │
                                                                 │
T-5.9 ──────────────────────────────────────────────────────────→┘
```

## Parallelization Opportunities

| Parallel Group | Tasks | After |
|---------------|-------|-------|
| API methods | T-2.2, T-2.3, T-2.4, T-2.5, T-2.6, T-2.7 | T-2.1 |
| Backend impls | T-3.2, T-3.3 | T-3.1 + T-2.x |
| New CLI cmds | T-4.3, T-4.4, T-4.5, T-4.6, T-4.7, T-4.8 | T-4.1 |
| New MCP tools | T-5.3, T-5.4, T-5.5, T-5.6, T-5.7, T-5.8 | T-3.4 |
| Docs | T-6.2, T-6.3 | T-6.1 |

**Maximum parallelism:** 6 tasks (new CLI commands or new MCP tools)
