# Specification: F-094 tana-local API Integration

## Context
> Generated from SpecFlow Interview conducted on 2026-01-29
> Collaboration context: supertag-cli is an open-source ecosystem partner with Tana

## Problem Statement

**Core Problem**: The current Input API has multiple significant limitations:
- Create-only: Cannot update existing nodes
- No tag mutations: Cannot add/remove tags from existing nodes
- No field updates: Cannot modify field values on existing nodes
- Stale reads: Export-based system has inherent lag

**Urgency**: Tana's Local API beta launches tomorrow (2026-01-30). We want supertag-cli to be ready as a collaborative ecosystem partner, demonstrating the value of the new API immediately.

**Impact if Unsolved**: Users must use tana-local MCP directly for mutations, fragmenting the workflow between tools.

## Users & Stakeholders

**Primary User**: Users running supertag-cli on local dev machines where Tana Desktop is running
- Technical Level: Power users comfortable with CLI
- Usage Context: Local development machine with Tana Desktop active

**Secondary Stakeholders**:
- AI agents via supertag-mcp (MCP server)
- Automation scripts (though limited to when Tana Desktop runs)

## Current State

**Existing Systems**:
- `supertag create` - Creates nodes via Tana Input API
- `supertag batch create` - Bulk creation via Input API
- supertag-mcp - MCP server exposing create tools

**Integration Points**:
- Input API: `https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2`
- tana-local REST API: `http://localhost:8262` (new)
- Config: `~/.config/supertag/config.json`

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Switch `create` command backend from Input API to tana-local REST API | Must |
| FR-2 | Switch `batch create` command backend to tana-local | Must |
| FR-3 | Add `supertag update <id>` command for updating existing nodes | Must |
| FR-4 | Add `supertag tag add <id> <tag>` and `supertag tag remove <id> <tag>` | Must |
| FR-5 | Add `supertag set-field <id> <field> <value>` command | Must |
| FR-6 | Add `supertag trash <id>` command (move to trash, not permanent delete) | Must |
| FR-6b | Add `supertag done <id>` and `supertag undone <id>` commands | Must |
| FR-6c | Add `supertag tag create <name>` command (create new supertag) | Should |
| FR-7 | Return created/updated node ID from write operations | Must |
| FR-8 | Update supertag-mcp tools to use tana-local backend | Must |
| FR-9 | Add Bearer token configuration via `supertag config --bearer-token` | Must |
| FR-10 | Keep Input API as fallback via config/flag for backward compatibility | Should |
| FR-11 | Investigate tana-local Search API for potential live read operations | Should |

### Non-Functional Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-1 | Config-driven API URL (default: `http://localhost:8262`) for future server API | Interview R4 |
| NFR-2 | Clear error when Tana Desktop not running | Interview R3 |
| NFR-3 | Partial success reporting for batch operations | Interview R6 |
| NFR-4 | Interactive token prompt when token expires | Interview R6 |
| NFR-5 | Contract tests against OpenAPI spec (no live server required) | Interview R7 |

## User Experience

### Configuration
```bash
# Set Bearer token (obtained from Tana Desktop > Settings > Local API)
supertag config --bearer-token "your_token_here"

# Optionally configure API URL (for future server API)
supertag config --local-api-url "http://localhost:8262"

# Keep Input API as fallback (optional, for backward compatibility)
supertag config --use-input-api true
```

### Write Commands (Updated)
```bash
# Create - same interface, now returns node ID
supertag create todo "Buy groceries" --status active
# Output: Created node: abc123xyz

# Batch create - same interface
supertag batch create --file nodes.json
# Output: Created 5 nodes: abc123, def456, ...

# NEW: Update existing node
supertag update abc123 --name "Updated name"

# NEW: Tag mutations
supertag tag add abc123 "priority"
supertag tag remove abc123 "draft"

# NEW: Field updates
supertag set-field abc123 "Status" "Complete"

# NEW: Delete (if supported)
supertag delete abc123 --confirm
```

### Error Handling
```bash
# Tana Desktop not running
supertag create todo "Test"
# Error: Cannot connect to Tana Local API at localhost:8262
# Ensure Tana Desktop is running with Local API enabled.
# To use legacy Input API, run: supertag config --use-input-api true

# Token expired
supertag create todo "Test"
# Error: Bearer token expired or invalid
# Please enter new token from Tana Desktop > Settings > Local API:
# > [interactive prompt]
```

## Edge Cases & Failure Modes

| Scenario | Expected Behavior |
|----------|-------------------|
| Tana Desktop not running | Clear error with instructions to start Tana or use Input API fallback |
| Bearer token expired | Interactive prompt to paste new token |
| Batch operation partial failure | Report which nodes succeeded/failed, continue processing |
| Node ID not found (update/delete) | Clear error: "Node abc123 not found" |
| Network timeout | Retry with exponential backoff (max 3 attempts) |
| Invalid field name | Error with list of valid fields for the supertag |

## Success Criteria

**Definition of Done**:
- [ ] All `create` commands work via tana-local REST API
- [ ] All `batch create` commands work via tana-local
- [ ] New `update`, `tag`, `set-field`, `delete` commands implemented
- [ ] supertag-mcp tools updated to use tana-local backend
- [ ] `config --bearer-token` command works
- [ ] Documentation updated (README, CHANGELOG, SKILL.md)
- [ ] Contract tests pass against OpenAPI spec

**Success Metrics**:
- Write operations complete without needing Input API fallback
- New mutation commands enable workflows previously impossible

## Scope

### In Scope
- tana-local REST API client module
- Create/update/delete/tag/set-field CLI commands
- Bearer token configuration
- MCP tool updates
- Config-driven URL for future server API
- Input API fallback option
- Contract tests

### Explicitly Out of Scope
- Server API support (wait for Tana to ship)
- Real-time read operations via tana-local (investigate for future)
- Hybrid data source (mixing tana-local reads with export index)
- Workspace switching via tana-local API

### Designed For But Not Implemented
- Read operation integration (architecture supports future tana-local reads)
- Server URL configuration structure ready for remote API

## Open Questions (Updated 2026-01-29)

- [x] Does tana-local support node deletion? → **No, only trash** (POST /nodes/{id}/trash)
- [ ] What are the rate limits on tana-local API?
- [x] Does tana-local Search API support complex queries? → **Yes, very powerful!** (and/or/not, regex, field filters)
- [ ] What's the token expiration policy?

## API Reference

OpenAPI spec saved to: `openapi.json` (in this spec directory)

Key endpoints verified:
- POST `/nodes/{parentNodeId}/import` - Create via Tana Paste
- POST `/nodes/{nodeId}/update` - Update name/description
- POST `/nodes/{nodeId}/tags` - Add/remove tags (batch)
- POST `/nodes/{nodeId}/fields/{attributeId}/content` - Set text/number/date field
- POST `/nodes/{nodeId}/fields/{attributeId}/option` - Set option field
- POST `/nodes/{nodeId}/done` - Mark as done/undone
- POST `/nodes/{nodeId}/trash` - Move to trash
- GET `/nodes/search?query={...}` - Powerful structured search

## Assumptions

- Tana Desktop must be running for write operations (no server API yet)
- Bearer token is obtained manually from Tana Desktop settings
- tana-local API follows OpenAPI spec at `/openapi.json`
- API is stable enough for production use (accepting beta risk)

## API Mapping

| Current (Input API) | New (tana-local REST) | Notes |
|---------------------|----------------------|-------|
| POST /addToNodeV2 | POST /nodes or import_tana_paste | Create nodes |
| - | PATCH /nodes/{id} | Update node (new) |
| - | POST /nodes/{id}/tags | Add tag (new) |
| - | DELETE /nodes/{id}/tags/{tag} | Remove tag (new) |
| - | PUT /nodes/{id}/fields/{field} | Set field (new) |
| - | DELETE /nodes/{id} | Delete node (new) |

---
*Interview conducted: 2026-01-29*
*Phases completed: 8/8*
