---
name: tana
description: |
  Complete Tana integration with seven capabilities: EXPORT (automated backup), READ (query exports), WRITE (Input API), INTERACTIVE (webhook server), WORKSPACES (multi-workspace management), MCP (AI tool integration), and EMBED (vector semantic search). Supports multi-workspace management with separate databases per workspace.

  **Three-Tool Architecture**:
  - `supertag` - Main CLI (lightweight, no browser dependencies)
  - `supertag-export` - Browser automation for exports (separate package with Playwright)
  - `supertag-mcp` - MCP server for AI tool integration (ChatGPT, Cursor, VS Code, etc.)

  READ: Parse and query Tana JSON exports via SQLite database
  WRITE: Format and post data to Tana via Input API
  INTERACTIVE: HTTP webhook server returning Tana Paste for seamless integration
  WORKSPACES: Multi-workspace management with aliasing, batch operations, and per-workspace configuration
  EXPORT: Automated browser-based JSON export via `supertag-export` tool
  MCP: Model Context Protocol server enabling Tana integration with any MCP-compatible AI tool
  EMBED: Vector embeddings for semantic similarity search using Ollama or Transformers.js

  USE WHEN user asks to:
  - "export tana" / "backup tana" / "download tana" (supertag-export)
  - "post to tana" / "send to tana" / "add to tana" (WRITE)
  - "query tana" / "search tana" / "find in tana" (READ)
  - "start tana server" / "tana webhook" (INTERACTIVE)
  - "format for tana" / "create tana node" (WRITE)
  - "tana stats" / "tana tags" / "tana references" (READ)
  - "create research in tana" / "add research summary" (WRITE)
  - "list tana supertags" / "show tana schema" / "sync tana schema" (SCHEMA)
  - "create any supertag" / "create meeting in tana" / "create project in tana" (DYNAMIC CREATE)
  - "add tana workspace" / "list tana workspaces" / "switch tana workspace" (WORKSPACES)
  - "sync all workspaces" / "export all workspaces" (BATCH OPERATIONS)
  - "setup tana mcp" / "configure tana for cursor" / "use tana with chatgpt" (MCP)
  - "semantic search tana" / "embed tana nodes" / "configure embeddings" (EMBED)
---

# Tana Integration Skill

**Complete Tana integration for PAI with seven modes**: EXPORT (automated backup), READ (query workspace exports), WRITE (Input API posting), INTERACTIVE (webhook server for bidirectional integration), WORKSPACES (multi-workspace management), MCP (AI tool integration), and EMBED (vector semantic search).

## Three-Tool Architecture

For **standalone distribution**, the skill is split into three tools:

| Tool | Size | Dependencies | Purpose |
|------|------|--------------|---------|
| `supertag` | ~57 MB | Drizzle, SQLite, Fastify, Zod | Main CLI (query, write, sync, server) |
| `supertag-export` | ~59 MB | Playwright | Browser automation for exports |
| `supertag-mcp` | ~60 MB | MCP SDK | AI tool integration server |

This separation keeps tools focused while enabling distribution as standalone executables.

## Hepta-Capability Architecture

This skill provides seven distinct integration modes:

### 1. EXPORT - Automated Backup (via `supertag-export`)
Browser automation using Playwright to download Tana JSON exports. **Separate tool** to keep main CLI lightweight. Supports daily scheduling via launchd.

### 2. READ - Query Workspace Exports
Parse Tana JSON exports, index in SQLite, and query with full-text search, pattern matching, and reference graph traversal.

### 3. WRITE - Input API Integration
Format JSON data as Tana Paste and post nodes programmatically via the Tana Input API.

### 4. INTERACTIVE - Webhook Server
HTTP server exposing query operations with Tana Paste responses for seamless bidirectional integration.

### 5. WORKSPACES - Multi-Workspace Management
Configure and manage multiple Tana workspaces with separate databases, aliasing, batch operations, and per-workspace settings.

### 6. MCP - AI Tool Integration (via `supertag-mcp`)
Model Context Protocol server enabling Tana integration with ChatGPT Desktop, Cursor, VS Code Copilot, Claude Code, and other MCP-compatible AI tools. Runs as a local subprocess with no network exposure.

### 7. EMBED - Vector Semantic Search
Generate vector embeddings for nodes and perform semantic similarity search using resona/LanceDB for cross-platform vector storage and efficient KNN search.

## Features

### EXPORT Capabilities
- **API-Based Export**: Fast exports via Tana's snapshot API (no browser needed for export)
- **Smart Authentication**: Three-tier auth with automatic fallback:
  1. Cached token (~0.7s) - uses previously saved token
  2. API refresh (~1.0s) - refreshes expired token via Firebase API
  3. Browser extraction (~8s) - fallback to Playwright if needed
- **Token Caching**: Tokens cached to `~/.cache/supertag/auth-token.json` with auto-refresh
- **Workspace Discovery**: Auto-discover all workspaces via network traffic capture
- **Multi-Workspace**: Export specific workspace or all enabled workspaces
- **Verbose Mode**: `-v` flag shows auth method used and detailed progress
- **Large Workspace Support**: Handles 1M+ node workspaces (~30s export)
- **Daily Automation**: launchd service for scheduled backups at 6 AM
- **Combined Workflow**: `tana-daily` script for export + index in one command
- **CLI Tools**: `supertag-export`, `tana-daily`, `tana-sync`

### READ Capabilities
- **Export Monitoring**: Automatic detection and indexing of new Tana exports
- **SQLite Database**: High-performance indexed storage of 1M+ nodes
- **Full-Text Search**: FTS5-powered search with relevance ranking
- **Pattern Matching**: SQL LIKE queries for flexible node discovery
- **Supertag Analysis**: Statistics and top tags by usage
- **Tag Application Queries**: Find all nodes with a specific supertag applied
- **Node Content Display**: Show full node contents with fields, children, and tags
- **Dynamic Field Mapping**: 700+ field names auto-extracted from supertag definitions
- **Reference Graph**: Traverse inbound/outbound node relationships
- **CLI Query Tools**: `tana query` (queries), `tana show` (content display), `tana sync` (monitoring)

### WRITE Capabilities
- **Dynamic Create Command**: Create any supertag node using schema registry with inheritance support
- **Format Command**: Convert JSON to Tana Paste format for manual pasting
- **Post Command**: Automatically post nodes to Tana via Input API
- **Multiple Input Sources**: JSON file (-f), inline JSON (--json), stdin, or CLI args
- **Verbose Mode**: Shows field mappings with inherited vs own field indicators
- **Schema Registry**: Extracts supertags from exports with full inheritance chain traversal
- **Config Management**: Store API tokens and settings securely
- **Unix Pipeline Support**: Compose with other CLI tools via stdin/stdout
- **Dry Run Mode**: Validate payloads before posting
- **Rate Limiting**: Automatic 1 call/second rate limiting (Tana API requirement)

### INTERACTIVE Capabilities
- **Webhook Server**: HTTP server with 6 REST endpoints
- **Tana Paste Responses**: All queries return Tana Paste format for seamless insertion
- **Bidirectional Converter**: JSON ↔ Tana Paste with round-trip preservation
- **Auto-Start Daemon**: launchd configuration for macOS automatic startup
- **CLI Management**: `tana server` commands for start/stop/status
- **Real-Time Queries**: Search, stats, tags, nodes, references via HTTP

### WORKSPACE Capabilities
- **Multi-Workspace Support**: Configure multiple Tana workspaces with separate databases
- **Workspace Aliasing**: Human-readable aliases for workspace IDs (e.g., `personal`, `work`)
- **Per-Workspace Databases**: Separate SQLite databases per workspace for isolation
- **Batch Operations**: Export and sync all enabled workspaces with `--all` flag
- **Default Workspace**: Set a default workspace for all operations
- **Per-Workspace Config**: Optional per-workspace API tokens and target nodes
- **Enable/Disable**: Control which workspaces are included in batch operations
- **XDG Paths**: Workspace data stored in `~/.local/share/supertag/workspaces/<alias>/`
- **Backward Compatible**: Legacy single-database mode still works if no workspaces configured

### MCP Capabilities
- **Universal AI Integration**: Works with ChatGPT Desktop, Cursor, VS Code Copilot, Claude Code, and any MCP-compatible tool
- **Five Query Tools**: `tana_search`, `tana_tagged`, `tana_stats`, `tana_supertags`, `tana_node`
- **Local Execution**: Runs as subprocess, no network server needed
- **Workspace Support**: Optional `TANA_WORKSPACE` environment variable for multi-workspace setups
- **Depth Traversal**: `tana_node` supports depth parameter to include children
- **JSON Output**: All tools return structured JSON for AI consumption
- **No Authentication**: Uses local SQLite database (requires `supertag sync index` first)
- **Cross-Platform**: Standalone binaries for macOS (ARM64/x64), Linux (x64), Windows (x64)

### EMBED Capabilities
- **Vector Semantic Search**: Find nodes by meaning, not just keywords
- **resona/LanceDB Storage**: Cross-platform vector storage without native extensions
- **Ollama Integration**: Generate embeddings using local Ollama server
- **Change Detection**: Text hashing to skip unchanged nodes during regeneration
- **Batch Processing**: Process embeddings in batches with progress reporting
- **Model Flexibility**: Support for multiple Ollama embedding models
- **CLI Commands**: `embed generate`, `embed search`, `embed stats`

**Supported Models (Ollama):**
nomic-embed-text (768d), mxbai-embed-large (1024d), all-minilm (384d), bge-m3 (1024d)

## Installation

### Prerequisites

Tana account and API token:
- Get your token from: https://app.tana.inc/?bundle=settings&panel=api

### Build the CLIs

```bash
cd ${PAI_DIR}/skills/tana

# Build main CLI
bun install
bun run build

# Build export CLI (optional - only if you need browser exports)
cd export
bun install
bun run build
# Note: Chromium browser auto-installs on first run (~300 MB download)

# Build MCP server (optional - only if you need AI tool integration)
cd ..
bun run build:mcp
```

This creates:
- `supertag` - Main CLI executable (~57 MB, standalone)
- `export/supertag-export` - Export CLI (~59 MB, standalone)
  - Chromium browser auto-downloads on first `login` or `run` command
- `supertag-mcp` - MCP server (~60 MB, standalone)

### Make Available Globally (Optional)

```bash
ln -s ${PAI_DIR}/skills/tana/supertag /usr/local/bin/supertag
ln -s ${PAI_DIR}/skills/tana/export/supertag-export /usr/local/bin/supertag-export
ln -s ${PAI_DIR}/skills/tana/supertag-mcp /usr/local/bin/supertag-mcp
```

## Configuration

### Environment Variables (Recommended)

```bash
export TANA_API_TOKEN="your_api_token_here"
export TANA_TARGET_NODE="INBOX"  # Optional: INBOX (default), SCHEMA, or node ID
export TANA_API_ENDPOINT="https://..."  # Optional: custom endpoint
```

### Config File

```bash
tana config --token YOUR_API_TOKEN
tana config --target INBOX
```

Creates `~/.config/supertag/config.json` with your settings.

### Default Paths (XDG Base Directory)

The CLI uses portable XDG Base Directory paths, making it distributable without hardcoded paths:

- **Config Directory**: `~/.config/supertag/` (or `$XDG_CONFIG_HOME/supertag/`)
- **Data Directory**: `~/.local/share/supertag/` (or `$XDG_DATA_HOME/supertag/`)
- **Cache Directory**: `~/.cache/supertag/` (or `$XDG_CACHE_HOME/supertag/`)
- **Log Directory**: `~/.local/state/supertag/logs/` (or `$XDG_STATE_HOME/supertag/logs/`)
- **Database**: `~/.local/share/supertag/supertag-index.db`
- **Export Directory**: `~/Documents/Tana-Export/`
- **Config File**: `~/.config/supertag/config.json`
- **Schema Cache**: `~/.cache/supertag/schema-registry.json`
- **Browser Data**: `~/.config/supertag/browser-data/`
- **PID File**: `~/.local/share/supertag/.tana-webhook.pid`
- **Server Config**: `~/.local/share/supertag/.tana-webhook.json`

> **Note**: Uses `supertag` namespace to avoid conflicts with the official Tana app.

**Legacy Path Support**: If a database exists at a legacy location but not at the XDG location, the CLI will use the legacy database. Use `tana migrate` to move to the portable location.

All READ/QUERY commands use the portable database path by default. Override with `--db-path` flag if needed.

### View All Paths

```bash
# Show all configuration and data paths
tana paths

# Output as JSON
tana paths --json
```

### Database Migration

If you have an existing database at a legacy location:

```bash
# Check if migration is needed
tana paths

# Preview migration (dry run)
tana migrate --dry-run

# Perform migration (copies database, preserves original)
tana migrate
```

### Priority Order

1. CLI flags (`--token`, `--target`, `--db-path`, `--workspace`)
2. Environment variables (`TANA_API_TOKEN`, `TANA_TARGET_NODE`)
3. Config file (`~/.config/supertag/config.json`)
4. Default workspace (if configured)
5. Defaults (`INBOX`, canonical database path)

## Workspace Management

Multi-workspace support allows you to manage multiple Tana workspaces with separate databases, making it easy to keep personal and work data isolated.

### Configure Workspaces

The easiest way is to use automatic discovery:

```bash
# Login and discover workspaces
supertag-export login
supertag-export discover --add

# This auto-configures all your workspaces with the correct rootFileId
```

For manual configuration:

```bash
# Add a workspace using rootFileId (from supertag-export discover)
tana workspace add M9rkJkwuED --alias personal --name "Personal Tana"
tana workspace add 7e25I56wgQ --alias work --name "Work Tana"

# Optionally add nodeid for Tana URL deep links
tana workspace add M9rkJkwuED --alias personal --nodeid tYHKjT1Lvj

# List configured workspaces
tana workspace list

# Show workspace details
tana workspace show personal

# Set default workspace
tana workspace set-default personal

# Remove a workspace
tana workspace remove work
tana workspace remove work --delete-data  # Also delete database files
```

### Enable/Disable for Batch Operations

```bash
# Disable a workspace from batch operations (--all)
tana workspace disable work

# Re-enable for batch operations
tana workspace enable work
```

### Using Workspaces

All query and sync commands support the `-w, --workspace` option:

```bash
# Query specific workspace
tana query search "meeting" -w personal
tana query stats -w work

# Sync specific workspace
tana sync index -w personal

# Show node from specific workspace
tana show node ABC123 -w work
```

### Batch Operations

Export and sync all enabled workspaces at once:

```bash
# Export all enabled workspaces
./export/supertag-export run --all

# Sync/index all enabled workspaces
tana sync index --all

# Show status of all workspaces
tana sync status --all

# Combined daily export + sync for all workspaces
./tana-daily --all
```

### Workspace Paths

Each workspace has isolated paths:

```
~/.local/share/supertag/workspaces/<alias>/
├── tana-index.db           # SQLite database
└── schema-registry.json    # Schema cache

~/Documents/Tana-Export/<alias>/
└── workspace@YYYY-MM-DD.json  # Export files
```

### Finding Your Workspace rootFileId

The `rootFileId` is the primary identifier required for exports. The easiest way to find it:

```bash
# Login and discover all workspaces
supertag-export login
supertag-export discover

# Output shows both nodeid (for URLs) and rootFileId (for API):
#   🏠 Personal Tana
#     nodeid: tYHKjT1Lvj
#     rootFileId: M9rkJkwuED  ← Use this for workspace add
```

The `nodeid` from Tana URLs (`https://app.tana.inc/?nodeid=XXX`) is optional - it's only used for generating deep links back to Tana.

## Usage

---

## MODE 0: EXPORT - Automated Backup (via `supertag-export`)

Fast JSON exports from Tana using the snapshot API. This is a **separate tool** (`supertag-export`) to keep the main CLI lightweight.

### First-Time Setup

```bash
# Install the export tool (if not already done)
cd ${PAI_DIR}/skills/tana/export
bun install
bun run build

# Login to Tana (opens browser for Google login)
# Chromium auto-downloads on first run if not installed (~300 MB)
supertag-export login

# Discover and auto-add all workspaces
supertag-export discover --add
```

This opens a Chromium browser where you log in to Tana. Once you see your workspace, close the browser. Your session is saved for future exports.

The `discover --add` command automatically:
1. Captures network traffic to find workspace `rootFileId` values
2. Configures each workspace with the correct identifiers
3. Sets the first workspace as default

### Manual Export

```bash
# Export default workspace
supertag-export run

# Export with verbose output (shows auth method)
supertag-export run -v

# Export specific workspace
supertag-export run -w personal

# Export all enabled workspaces
supertag-export run --all

# Custom export directory
supertag-export run -o ./my-exports

# Check export configuration and auth status
supertag-export status
```

Exports are saved to `~/Documents/Tana-Export/<workspace>/<rootFileId>@YYYY-MM-DD.json`.

### Authentication Flow

The export tool uses a three-tier authentication system (automatic, no user action needed):

1. **Cached token** (~0.7s) - Uses previously saved token from `~/.cache/supertag/auth-token.json`
2. **API refresh** (~1.0s) - Refreshes expired token via Firebase REST API
3. **Browser extraction** (~8s) - Falls back to Playwright if API refresh fails

Use `-v` flag to see which method was used:

```bash
supertag-export run -v
# Output: [supertag-export] Using cached token
# Output: [supertag-export] Token valid (expires in 57 minutes, method: cached)
```

### Automated Daily Export

```bash
# Combined export + sync (index into SQLite)
./tana-daily

# Export only (uses supertag-export internally)
./tana-daily --export

# Sync/index only (use latest export)
./tana-daily --sync

# Export and sync all workspaces
./tana-daily --all

# Verbose mode
./tana-daily --verbose
```

Note: `tana-daily` orchestrates both `supertag-export` (for API export) and `tana sync` (for indexing).

### Install Scheduled Automation (macOS)

```bash
# Install launchd service (runs at 6 AM daily)
cp launchd/com.kai.tana-daily.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.kai.tana-daily.plist

# Verify installation
launchctl list | grep tana

# Uninstall
launchctl unload ~/Library/LaunchAgents/com.kai.tana-daily.plist
rm ~/Library/LaunchAgents/com.kai.tana-daily.plist
```

### How Export Works

1. Authenticates via cached token, API refresh, or browser extraction
2. Fetches workspace metadata from Tana's snapshot API
3. Downloads the snapshot JSON directly via signed URL
4. Saves to export directory

### Performance

- **Small workspaces** (< 100k nodes): ~5 seconds
- **Large workspaces** (1M+ nodes): ~30 seconds
- Token cached for ~1 hour, auto-refreshes when expired

---

## MODE 1: READ - Query Workspace Exports

Query and analyze your Tana workspace by parsing JSON exports and indexing them in SQLite.

### Step 1: Export Your Tana Workspace

**Option A (Manual):**
1. In Tana, go to Settings → Export
2. Export as JSON format
3. Save to `~/Documents/Tana-Export/`

**Option B (Automated):**
```bash
./tana-daily  # or ./export/supertag-export run
```

### Step 2: Index the Export

```bash
# One-time indexing
tana sync index

# Monitor directory for new exports (daemon mode)
tana sync monitor --watch
```

This creates `tana-index.db` (SQLite database) with indexed nodes, supertags, fields, references, and tag applications.

### Step 3: Query the Database

#### Full-Text Search

Search resolves to tagged ancestor nodes by default, providing meaningful semantic results instead of raw content fragments.

```bash
# Search by keyword (resolves to tagged ancestors)
tana query search "meeting" --limit 10

# Search with raw FTS results (no resolution)
tana query search "meeting" --raw

# Search resolving to named ancestors (broader context)
tana query search "meeting" -n

# Multi-word search
tana query search "project planning"

# Output as JSON for piping
tana query search "task" --json
```

**Search Resolution Modes:**
- **Default (tagged)**: Returns unique tagged ancestor nodes - best signal-to-noise ratio
- **`--raw`**: Returns raw FTS matches including content fragments and tuples
- **`-n` (named)**: Returns first named ancestor - broader but noisier than tagged

#### Find Nodes by Pattern

```bash
# Pattern matching (SQL LIKE)
tana query nodes --pattern "Project%"

# Filter by supertag
tana query nodes --tag "meeting"

# Combined filters
tana query nodes --pattern "Q4%" --tag "project" --limit 20
```

#### Supertag Analysis

```bash
# List all supertags
tana query tags

# Top 20 most-used tags
tana query tags --top 20

# JSON output
tana query tags --json
```

#### Reference Graph

```bash
# Show relationships for a node
tana query refs <node-id>

# Example
tana query refs AInt1f2QagVo
```

#### Database Statistics

```bash
# Overall statistics
tana query stats

# Recently updated nodes
tana query recent --limit 10
```

#### Find Nodes by Tag (Tag Applications)

Query nodes that have a specific supertag applied:

```bash
# Find nodes tagged with #project (latest 10)
tana query tagged project --limit 10

# Find nodes tagged with #meeting, ordered by update time
tana query tagged meeting --order-by updated --limit 20

# Case-insensitive tag matching (tries Project, project, PROJECT)
tana query tagged Project -i --limit 10

# Output as JSON for piping
tana query tagged todo --json
```

#### Top Tags by Usage

See which supertags are most frequently applied:

```bash
# Show top 20 most-used tags
tana query top-tags --limit 20

# JSON output
tana query top-tags --json
```

#### Show Full Node Contents

Display complete node contents with fields, children, and tags:

```bash
# Show latest node with specific tag
tana show tagged project

# Show multiple nodes
tana show tagged meeting --limit 3

# Show specific node by ID
tana show node aL_DgoY0OG21

# JSON output for piping
tana show tagged Deliverable --json
```

Output includes:
- Node name and applied supertags
- Creation date
- All fields with resolved values (Status, Vault, Focus, Due date, etc.)
- Content children (non-field nodes)
- Properly formatted dates (extracts YYYY-MM-DD from Tana date spans)

### Performance

- **Indexing**: 107k nodes/second
- **FTS5 Search**: < 50ms for typical queries
- **SQL Queries**: < 100ms
- **Database Size**: ~500MB for 1M nodes

---

## MODE 2: INTERACTIVE - Webhook Server

HTTP server providing Tana Paste responses for seamless bidirectional integration.

### Step 1: Start the Webhook Server

```bash
# Start in foreground
tana server start --port 3100

# Start in background
tana server start --port 3100 --daemon

# Custom database path
tana server start --port 3100 --db-path ./my-database.db
```

### Step 2: Install as Auto-Start Service (macOS)

```bash
# Install launchd service (auto-start on boot)
./install-launchd.sh

# Check service status
tana server status

# Uninstall service
./uninstall-launchd.sh
```

The server will automatically start on boot and restart on crashes.

### Step 3: Use the API Endpoints

All endpoints return **Tana Paste format** (plain text) ready for direct insertion into Tana.

#### Health Check

```bash
curl http://localhost:3100/health
```

Response (JSON):
```json
{"status":"ok","timestamp":1764515323107}
```

#### Search (Full-Text)

```bash
curl -X POST http://localhost:3100/search \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting", "limit": 5}'
```

Response (Tana Paste):
```
- Search Results: meeting
  - Team Meeting #meeting
    - Node ID:: CLYvmr6p3S
    - Rank:: -7.61
  - Meeting Notes
    - Node ID:: abc123
    - Rank:: -7.83
```

#### Database Stats

```bash
curl http://localhost:3100/stats
```

Response (Tana Paste):
```
- Database Statistics
  - Total Nodes:: 1,220,449
  - Total Supertags:: 568
  - Total Fields:: 1,502
  - Total References:: 21,943
  - Tag Applications:: 11,233
```

#### Top Supertags

```bash
curl -X POST http://localhost:3100/tags \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

#### Find Nodes

```bash
curl -X POST http://localhost:3100/nodes \
  -H "Content-Type: application/json" \
  -d '{"pattern": "Project%", "limit": 5}'
```

#### Reference Graph

```bash
curl -X POST http://localhost:3100/refs \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "AInt1f2QagVo"}'
```

### Integration with Tana

1. Start the webhook server (daemon mode recommended)
2. In Tana, create a command node that calls the webhook
3. The response is automatically inserted as Tana nodes

**Example Tana Command:**
```
/webhook http://localhost:3100/search?query=template
```

The response (Tana Paste format) is automatically parsed and inserted into your workspace.

### Server Management

```bash
# Check status
tana server status

# View logs (if using launchd)
tail -f logs/tana-webhook.log

# Restart (if using launchd)
launchctl kickstart -k gui/$(id -u)/com.pai.tana-webhook

# Stop server
tana server stop
```

---

## MODE 4: MCP - AI Tool Integration

The MCP (Model Context Protocol) server enables Tana integration with AI tools like ChatGPT Desktop, Cursor, VS Code Copilot, Claude Code, and other MCP-compatible applications.

### Available Tools

| Tool | Description |
|------|-------------|
| `tana_search` | Full-text search across your Tana workspace. Parameters: `query` (required), `workspace`, `limit`, `raw`, `resolveNamed` |
| `tana_tagged` | Find nodes by supertag. Parameters: `tagname` (required), `workspace`, `limit`, `orderBy`, `caseInsensitive` |
| `tana_stats` | Database statistics. Parameters: `workspace` |
| `tana_supertags` | List all supertags. Parameters: `workspace`, `limit` |
| `tana_node` | Get node contents with depth traversal. Parameters: `nodeId` (required), `workspace`, `depth` |
| `tana_create` | Create new nodes with supertags and references. Parameters: `supertag` (required), `name` (required), `fields`, `children`, `workspace`, `target`, `dryRun` |
| `tana_sync` | Trigger reindex or check status. Parameters: `action` (index/status), `workspace` |

### Important: Reference Syntax

The Tana Input API does **NOT** support inline reference syntax (`[[text^nodeId]]`) in node names. If you include such syntax, it will appear as plain text, not a clickable link.

To create nodes with references to other nodes, use the `children` parameter:

```json
{
  "supertag": "todo",
  "name": "Follow up on feedback form",
  "children": [{"name": "NetSec Feedback Form", "id": "dvpAO46vtnrx"}]
}
```

This creates a todo with a child reference that links to the existing node.

### URL Children (Clickable Links)

To create clickable URL children (e.g., hook:// links, https:// links), use `dataType: 'url'`:

```json
{
  "supertag": "todo",
  "name": "Review email from John",
  "children": [
    {"name": "hook://email/abc123", "dataType": "url"},
    {"name": "https://example.com/doc", "dataType": "url"}
  ]
}
```

Without `dataType: 'url'`, links appear as plain text. With it, they become clickable in Tana.

**Child Types Summary:**
| Type | Syntax | Result |
|------|--------|--------|
| Plain text | `{"name": "Note"}` | Plain text node |
| Reference | `{"name": "Link", "id": "nodeId"}` | Link to existing node |
| URL | `{"name": "https://...", "dataType": "url"}` | Clickable URL |

### Setup for Claude Code

Add to `~/.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp",
      "env": {
        "TANA_WORKSPACE": "personal"
      }
    }
  }
}
```

Restart Claude Code to load the new MCP server.

### Setup for Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp"
    }
  }
}
```

Then:
1. Open Cursor Settings: `File → Preferences → Cursor Settings`
2. Select "MCP" from sidebar
3. Verify tools appear: `tana_search`, `tana_tagged`, `tana_stats`, `tana_supertags`, `tana_node`
4. Restart Cursor if needed

### Setup for ChatGPT Desktop

Add to ChatGPT Desktop's MCP configuration (location varies by platform):

```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp"
    }
  }
}
```

### How It Works

1. AI tool spawns `supertag-mcp` as a local subprocess
2. Communication via stdin/stdout JSON-RPC protocol
3. Server reads your local SQLite database (requires `supertag sync index` first)
4. All data stays on your machine - no network server needed

### Example AI Queries

Once configured, ask your AI tool:
- "Search my Tana for notes about authentication"
- "Find all my todos in Tana"
- "What supertags do I have?"
- "Show me the node with ID abc123 and its children"
- "List recent meetings from Tana"
- "Create a todo called 'Review PR' with status active"
- "Create a todo linked to node abc123" (uses children parameter for proper references)
- "Reindex my Tana database"

### Testing the MCP Server

```bash
# Test with MCP Inspector (interactive)
npx @modelcontextprotocol/inspector bun run src/mcp/index.ts

# Test via stdin
cat << 'EOF' | supertag-mcp 2>/dev/null
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
EOF
```

### Building the MCP Server

```bash
# Development
bun run src/mcp/index.ts

# Build standalone binary
bun run build:mcp

# Cross-platform builds (via release.sh)
bun build src/mcp/index.ts --compile --target=bun-darwin-x64 --outfile supertag-mcp-darwin-x64
bun build src/mcp/index.ts --compile --target=bun-linux-x64 --outfile supertag-mcp-linux-x64
bun build src/mcp/index.ts --compile --target=bun-windows-x64 --outfile supertag-mcp-windows-x64.exe
```

---

## MODE 6: EMBED - Vector Semantic Search

Vector embeddings enable semantic search - find nodes by meaning, not just keywords. Uses resona/LanceDB for cross-platform vector storage and efficient KNN search.

### Prerequisites

Requires Ollama running locally with an embedding model:

```bash
# Install Ollama from https://ollama.ai
# Then pull an embedding model:
ollama pull mxbai-embed-large  # Recommended
# Or: ollama pull nomic-embed-text
```

Embedding configuration is stored in `~/.config/supertag/config.json` and defaults to `mxbai-embed-large`.

### Generate Embeddings

```bash
# Generate embeddings (smart filtering applied by default)
supertag embed generate

# Generate with verbose output showing filter details
supertag embed generate --verbose

# Generate for specific supertag only
supertag embed generate --tag meeting

# Limit number of nodes (useful for testing)
supertag embed generate --limit 100

# Regenerate all (ignore cache)
supertag embed generate --all
```

### Smart Content Filtering

By default, `embed generate` filters out noise to focus on meaningful content:

```bash
# View filtering statistics and breakdown by docType
supertag embed filter-stats

# Customize content filtering
supertag embed generate --min-length 20      # Only nodes >= 20 chars
supertag embed generate --include-all        # Bypass all filters
supertag embed generate --include-timestamps # Include 1970-01-01 artifacts
supertag embed generate --include-system     # Include system docTypes
```

**Default Filters (reduce workload by ~43%):**

| Filter | Default | Excludes |
|--------|---------|----------|
| Min length | 10 chars | "Yes.", "Mhm.", "*", short noise |
| Timestamps | Excluded | 1970-01-01... import artifacts |
| System types | Excluded | tuple, metanode, viewDef, search, command, etc. |

**Included Content Types:** Regular nodes, transcriptLine, chat, url, codeblock, transcript

### Semantic Search

```bash
# Search by meaning
supertag embed search "project planning discussions"

# With result limit
supertag embed search "authentication issues" --limit 20

# With similarity threshold
supertag embed search "budget review" --threshold 0.7

# Show full node details (fields, children, tags)
supertag embed search "meeting notes" --show

# Show node details with child traversal
supertag embed search "project ideas" --show --depth 1

# JSON output
supertag embed search "api design" --format json

# JSON with full node contents
supertag embed search "tasks" --show --format json
```

**Search Options:**

| Flag | Description |
|------|-------------|
| `--limit <n>` | Number of results (default: 10) |
| `--threshold <n>` | Minimum similarity threshold (0-1) |
| `--show` | Display full node contents (fields, children, tags) |
| `--depth <n>` | Child traversal depth when using --show (default: 0) |
| `--format <fmt>` | Output format: table (default), json |

### Embedding Statistics

```bash
# Show embedding stats and coverage
supertag embed stats
```

### Available Providers and Models

| Model | Dimensions | Notes |
|-------|------------|-------|
| **mxbai-embed-large** | 1024d | Recommended, excellent quality |
| **nomic-embed-text** | 768d | Good balance of speed/quality |
| **all-minilm** | 384d | Fast, smaller embeddings |
| **bge-m3** | 1024d | Multi-lingual support |

### Technical Notes

- **Cross-Platform**: Uses resona/LanceDB - no native extensions required
- **Change Detection**: Uses SHA256 text hashing to skip unchanged nodes during regeneration
- **Batch Processing**: Processes embeddings in batches with progress reporting
- **Storage**: Embeddings stored in LanceDB format (`.lance` directory next to SQLite database)

---

## MODE 5: WRITE - Input API Integration

### Format Command

Convert JSON to Tana Paste format:

```bash
# Simple node
echo '{"name": "My Note", "tag": "note"}' | tana format

# With fields
echo '{"name": "Task", "tag": "task", "status": "pending", "priority": "high"}' | tana format

# With nested arrays
echo '{"name": "Meeting", "tag": "meeting", "attendees": ["Alice", "Bob"]}' | tana format

# From file
cat data.json | tana format

# From API response
curl https://api.example.com/data | jq '.items' | tana format
```

**Output Format (Tana Paste):**

```
%%tana%%
- My Note #note
  - status:: pending
  - priority:: high
```

### Post Command

Post data directly to Tana:

```bash
# Post to INBOX (default)
echo '{"name": "Task", "tag": "task"}' | tana post

# Post to SCHEMA
echo '{"name": "New Supertag"}' | tana post --target SCHEMA

# Post to specific node
echo '{"name": "Note"}' | tana post --target SYS_A82Hk3Nl

# Dry run (validate without posting)
cat data.json | tana post --dry-run

# Verbose output
echo '{"name": "Task"}' | tana post --verbose

# Override token for one-off post
echo '{"name": "Note"}' | tana post --token DIFFERENT_TOKEN
```

### Schema Command

Manage the supertag schema registry. The registry extracts all supertags and their fields from your Tana workspace export, enabling dynamic node creation for any supertag without hardcoded definitions.

```bash
# Sync schema from latest Tana export (auto-discovers from ~/Documents/Tana-Export/)
tana schema sync

# Sync from specific export file
tana schema sync /path/to/export.json

# List all supertags in the registry
tana schema list

# Show fields for a specific supertag
tana schema show research
tana schema show todo

# Search supertags by name
tana schema search meeting
tana schema search project
```

**Schema Commands:**

- `sync [path]`: Extract supertags from Tana export and cache them locally
- `list`: List all supertags with field counts
- `show <name>`: Display supertag fields with attribute IDs and CLI examples
- `search <query>`: Search supertags by partial name match

**Schema Cache:**

The registry is cached at `~/.cache/supertag/schema-registry.json` for fast access. Re-run `sync` after exporting a new workspace to update the cache.

**Output Formats:**

```bash
# Default table format
tana schema list

# JSON format for piping
tana schema list --format json

# Names only (one per line)
tana schema list --format names
```

### Create Command

Dynamically create any supertag node using the schema registry. The unified create command replaces specialized commands (todo, video, research) - fields are resolved from the synced schema with full inheritance support.

**Multiple Supertags:** You can apply multiple supertags to a single node using comma-separated syntax:
```bash
tana create video,towatch "Tutorial Video" --url https://example.com
tana create todo,urgent "Critical Bug" --status active
```

```bash
# Create todo node with CLI arguments
tana create todo "Buy groceries" --status active --duedate 2025-12-31

# Create meeting
tana create meeting "Team Standup" --date 2025-12-06

# Create research node
tana create research "AI Summary" --topic AI --period 2025-11

# Create node with multiple supertags
tana create video,towatch "Learn TypeScript" -f video.json
tana create task,urgent,review "PR Review" --status next-up

# From JSON file (-f)
tana create todo -f task.json
tana create video -f video-data.json --verbose

# From inline JSON (--json)
tana create todo --json '{"name": "Task", "status": "active"}'

# From stdin
echo '{"name": "Research AI", "topic": "AI"}' | tana create research
cat data.json | tana create todo

# Dry run (validate without posting)
tana create todo "Test" --dry-run

# Verbose mode (shows field mappings and inheritance)
tana create todo "Test" --status active -v --dry-run

# Multiple supertags with verbose mode
tana create video,towatch "Tutorial" -v --dry-run
```

**Options:**

- `-t, --target <node>`: Target node ID (INBOX, SCHEMA, or specific node ID)
- `--token <token>`: API token (overrides config)
- `-d, --dry-run`: Validate but don't post (dry run mode)
- `-v, --verbose`: Verbose output with field mapping details
- `-f, --file <path>`: Read JSON input from file
- `--json <json>`: Pass JSON input directly as argument

**Input Source Priority:**

1. `--file` flag (reads JSON from file)
2. `--json` flag (parses inline JSON)
3. stdin (if data is piped)
4. CLI arguments (positional name + field flags)

**Verbose Mode (-v):**

Shows detailed field mapping information:
- Supertag name(s) and ID(s)
- Parent supertags (inheritance chain) for each tag
- Input source being used
- Field mappings with "(inherited)" indicator for inherited fields
- Attribute IDs for each field

Example verbose output (single supertag):
```
⚙️  Configuration:
   Supertag: Todo (fbAkgDqs3k)
   Extends: task-base, Stream | Actions
   Endpoint: https://europe-west1-tana-...
   Target: INBOX
   Input: cli
   Dry run: yes

📝 Creating node:
   Name: Test task

   Field mappings:
   - status → Status (inherited)
     Value: active
     Attribute ID: xQVRz63l5Pth
```

Example with multiple supertags:
```
⚙️  Configuration:
   Supertags: video, towatch
     - video (-iZ7Rsg93Q)
     - towatch (abc123xyz)
   video extends: media-base
   Endpoint: https://europe-west1-tana-...
   Target: INBOX
   Input: file
   Dry run: no

📝 Creating node:
   Name: Learn TypeScript

   Field mappings:
   - url → URL
     Value: https://youtube.com/...
     Attribute ID: field3
   - priority → Priority (inherited)
     Value: high
     Attribute ID: field4
```

**How it Works:**

1. Parses supertag input (supports single, comma-separated, or array)
2. Validates all supertags exist in the schema registry
3. Collects fields from all specified supertags (deduplicated)
4. Includes inherited fields from parent supertags for each tag
5. Resolves field names to their Tana attribute IDs
6. Builds the API payload with all supertag IDs
7. Posts to Tana (or dry-run validates)

**Field Name Matching:**

Field names are normalized for matching:
- Case-insensitive (`--Topic` and `--topic` both work)
- Spaces and dashes removed (`--article-count` matches `articlecount`)
- Underscores removed (`--article_count` matches `articlecount`)

**Examples:**

```bash
# First, see what fields are available (including inherited)
tana schema show todo

# Then create a node with those fields
tana create todo "Buy groceries" --status active --duedate 2025-12-15

# Or use JSON file for complex data
cat > task.json << EOF
{
  "name": "Complete quarterly report",
  "status": "active",
  "dueDate": "2025-12-15"
}
EOF
tana create todo -f task.json

# Or pipe JSON for quick creation
echo '{"name": "Review PR", "status": "next-up"}' | tana create todo
```

### Config Command

Manage configuration:

```bash
# Show current configuration
tana config --show

# Set API token
tana config --token YOUR_API_TOKEN

# Set default target node
tana config --target INBOX

# Set API endpoint (if using custom)
tana config --endpoint https://...
```

### Pipeline Workflows

Combine with other tools:

```bash
# Format then manually paste
cat data.json | tana format | pbcopy

# Format and post in one pipeline
cat data.json | tana format | tana post

# Fetch from API, transform, and post
curl https://api.example.com/tasks | \
  jq '.[] | {name: .title, tag: "task", status: .status}' | \
  tana post

# Calendar events to Tana
calendar "next week" --format json | \
  jq '[.[] | {name: .title, tag: "event", date: .date}]' | \
  tana post

# Batch processing with rate limiting (automatic)
cat bulk-data.jsonl | tana post
```

## JSON Input Format

### Generic Structure

The skill automatically converts any JSON to Tana nodes:

```json
{
  "name": "Node Title",
  "tag": "supertag_name",
  "field1": "value",
  "field2": ["item1", "item2"],
  "nested": {
    "child_field": "value"
  }
}
```

### Field Detection

The converter looks for these fields:
- **Name**: `name`, `title`, `label`, `heading`, `subject`, `summary`
- **Supertag**: `supertag`, `tag`
- **Everything else**: Becomes fields or child nodes

### Array Handling

```json
{
  "name": "Meeting",
  "attendees": ["Alice", "Bob", "Charlie"]
}
```

Outputs:

```
%%tana%%
- Meeting
  - attendees::
    - Alice
    - Bob
    - Charlie
```

### Nested Objects

```json
{
  "name": "Project",
  "details": {
    "name": "Budget",
    "amount": 50000
  }
}
```

Outputs:

```
%%tana%%
- Project
  - Budget
    - amount:: 50000
```

## Examples

### Example 1: Create a Todo

```bash
# Simple todo with status (using unified create command)
tana create todo "Buy groceries" --status active --duedate 2025-11-30

# Todo with status and focus
tana create todo "Review security policies" \
  --status next-up \
  --duedate 2025-12-01 \
  --focus "kn-Rrp5j8oEf"

# Todo from JSON file
cat > task.json << EOF
{
  "name": "Complete quarterly report",
  "status": "active",
  "dueDate": "2025-12-15"
}
EOF
tana create todo -f task.json

# Todo from stdin
echo '{"name": "Review PR", "status": "next-up"}' | tana create todo
```

### Example 2: Create a Research Node

```bash
# Simple research with CLI args
tana create research "AI Research November 2025" \
  --topic "AI" \
  --period "2025-11" \
  --articlecount 150

# Research from inline JSON
tana create research --json '{
  "name": "November AI Summary",
  "topic": "AI",
  "period": "2025-11",
  "articleCount": 175
}'

# Research from JSON file with verbose output
echo '{
  "name": "November AI & ML Research Summary",
  "topic": ["AI", "Machine Learning", "LLMs"],
  "period": "2025-11",
  "articleCount": 175
}' > research.json
tana create research -f research.json -v
```

### Example 3: Create a Note

```bash
echo '{
  "name": "Meeting with Daniela",
  "tag": "meeting",
  "date": "2025-11-29",
  "attendees": ["Daniela", "Jens-Christian"],
  "topics": ["Project planning", "Budget review"]
}' | tana post
```

### Example 3: Process Calendar Events

```bash
calendar "tomorrow" --format json | \
  jq '[.[] | {
    name: .title,
    tag: "event",
    date: .date,
    duration: .duration,
    calendar: .calendar
  }]' | \
  tana post --target INBOX
```

### Example 4: Format for Manual Paste

```bash
curl https://api.github.com/repos/myuser/myrepo/issues | \
  jq '[.[] | {
    name: .title,
    tag: "task",
    status: .state,
    url: .html_url,
    created: .created_at
  }]' | \
  tana format | \
  pbcopy
```

### Example 5: Dry Run Validation

```bash
cat bulk-import.json | tana post --dry-run --verbose
```

## API Constraints

The Tana Input API has these limits:
- **Rate Limit**: 1 call per second per token (automatically enforced)
- **Max Nodes**: 100 nodes per request
- **Max Payload**: 5000 characters per request
- **Node Name**: 500 characters maximum

The skill validates these constraints before posting.

## Integration with PAI

This skill can be invoked by Kai when you ask:
- "Post this to Tana"
- "Add this to my Tana"
- "Format this for Tana"
- "Create a Tana node with..."
- "Create a todo in Tana"
- "Add a todo: [task name]"
- "Create research in Tana"
- "Add research summary to Tana"
- "Create a meeting in Tana"
- "Add a video to Tana"

Kai will construct the appropriate JSON and call `tana create <supertag>` with the unified create command. All supertags in your workspace are supported through the schema registry.

## Architecture

### Technology Stack

- **Language**: TypeScript with strict mode
- **Runtime**: Bun
- **CLI Framework**: Commander.js
- **API Client**: Native fetch
- **Rate Limiting**: Custom RateLimiter class

### File Structure

```
tana/
├── SKILL.md              # This file
├── README.md             # Quick start guide
├── package.json          # Main CLI dependencies (no Playwright)
├── tsconfig.json         # TypeScript config
├── .env.example          # Example environment variables
├── supertag              # Main CLI executable (~57 MB)
├── supertag-mcp          # MCP server executable (~60 MB)
├── export/               # SEPARATE PACKAGE for browser exports
│   ├── package.json      # Export CLI dependencies (Playwright)
│   ├── index.ts          # supertag-export CLI entry point
│   └── supertag-export   # Export CLI executable (~59 MB)
└── src/
    ├── index.ts          # Main CLI entry point
    ├── types.ts          # Type definitions
    ├── commands/
    │   ├── format.ts     # Format command
    │   ├── post.ts       # Post command
    │   ├── config.ts     # Config command
    │   ├── schema.ts     # Schema management command
    │   ├── create.ts     # Universal supertag creation
    │   ├── query.ts      # Query command group (search, nodes, tags, refs, stats, tagged, top-tags, recent)
    │   ├── show.ts       # Show command group (node, tagged)
    │   ├── sync.ts       # Sync command group (monitor, index, status)
    │   ├── server.ts     # Server command group (start, stop, status)
    │   ├── workspace.ts  # Workspace command group (list, add, remove, set-default, show, enable, disable)
    │   └── embed.ts      # Embed command group (config, generate, search, stats)
    ├── mcp/              # MCP SERVER MODULE
    │   ├── index.ts      # MCP server entry point
    │   ├── schemas.ts    # Zod schemas for all tools
    │   └── tools/
    │       ├── search.ts     # tana_search tool
    │       ├── tagged.ts     # tana_tagged tool
    │       ├── stats.ts      # tana_stats tool
    │       ├── supertags.ts  # tana_supertags tool
    │       └── node.ts       # tana_node tool
    ├── schema/
    │   ├── index.ts      # Schema module exports
    │   ├── registry.ts   # SchemaRegistry class with inheritance support
    │   └── registry.test.ts  # Schema registry tests (150 tests)
    ├── embeddings/       # VECTOR EMBEDDING MODULE (resona/LanceDB)
    │   ├── tana-embedding-service.ts  # Resona wrapper for Tana
    │   ├── embed-config-new.ts   # Model configuration
    │   ├── contextualize.ts      # Node context building
    │   ├── content-filter.ts     # Node filtering
    │   ├── search-filter.ts      # Search result filtering
    │   └── ancestor-resolution.ts # Ancestor context lookup
    ├── formatters/
    │   ├── tanaPaste.ts       # Tana Paste formatter
    │   └── json.ts            # Generic JSON converter
    ├── api/
    │   ├── client.ts     # Tana Input API client
    │   └── rateLimit.ts  # Rate limiter (1 call/sec)
    ├── config/
    │   ├── paths.ts      # Portable XDG path configuration
    │   └── manager.ts    # Config management
    ├── db/
    │   └── indexer.ts    # SQLite indexer for Tana exports
    ├── query/
    │   └── tana-query-engine.ts  # Query engine with FTS5 search
    ├── monitors/
    │   └── tana-export-monitor.ts  # Export directory watcher
    ├── server/
    │   └── tana-webhook-server.ts  # HTTP webhook server
    ├── parsers/
    │   ├── json.ts       # JSON parser
    │   └── stdin.ts      # Stdin reader
    └── utils/
        └── errors.ts     # Custom error classes
```

### How It Works

1. **Input**: Read JSON from stdin or arguments
2. **Parse**: Parse JSON (supports JSON and JSON Lines format)
3. **Convert**: Transform JSON to TanaNode structure
4. **Format/Post**:
   - Format: Convert to Tana Paste string
   - Post: Convert to API payload and POST to Tana
5. **Rate Limit**: Automatically enforce 1 call/second
6. **Output**: Print result or error

## Development

### Run in Development Mode

```bash
bun run dev format < input.json
bun run dev post --dry-run < input.json
bun run dev config --show
```

### Build

```bash
bun run build
```

### Test

```bash
bun test  # (tests not yet implemented)
```

## Troubleshooting

### API Token Issues

**Error**: "API token not configured"

**Solution**: Set token via environment variable, config file, or CLI flag:

```bash
# Environment variable (recommended)
export TANA_API_TOKEN="your_token"

# Config file
tana config --token your_token

# CLI flag (one-off)
echo '{"name": "Test"}' | tana post --token your_token
```

### Rate Limiting

The Tana API allows 1 call per second. The skill automatically enforces this. If you're posting multiple nodes, they'll be queued and sent at 1-second intervals.

### Invalid JSON

**Error**: "Invalid JSON input"

**Solution**: Validate your JSON:

```bash
# Validate with jq
echo '{"name": "Test"}' | jq .

# Pretty print before posting
cat data.json | jq . | tana format
```

### Payload Too Large

**Error**: "Payload too large"

**Solution**: Split into smaller batches:

```bash
# Split array into chunks
cat large.json | jq -c '.[] | .' | head -n 50 | tana post
```

## Tana Paste Format Reference

### Basic Node

```
- Node name #supertag
```

### With Fields

```
- Node name #supertag
  - field1:: value1
  - field2:: value2
```

### With Arrays

```
- Node name
  - field::
    - item1
    - item2
```

### With Dates

```
- Node name
  - Date:: [[date:2025-11-29]]
  - Date range:: [[date:2025-11-29 09:00/2025-11-29 10:00]]
```

### With References

To reference existing nodes in Tana Paste format, use double brackets:

- `[[Node Name]]` — Reference by name (creates new node if name doesn't exist)
- `[[Node Name^nodeID]]` — Reference by name AND nodeID (preferred - guaranteed to link to existing node)
- `[[^nodeID]]` — Reference by nodeID only

**Examples:**
```
- My Note
  - Related:: [[Other Node]]
  - Specific Node:: [[Task Name^7KZ0lBEX0-3r]]
  - By ID Only:: [[^SYS_A1B2C3]]
```

**With Tags:**
```
- [[Node Name #tag]]
- [[Node Name #tag^nodeID]]
```

Find a node's ID by copying its link (the part after `nodeid=` in the URL).

## Future Enhancements (Phase 2+)

Planned for future versions:

- [ ] Template system for common node types (note, task, event, bookmark)
- [ ] `tana send` command (combined format + post)
- [ ] `tana validate` command (validate JSON structure)
- [ ] Batch processing with progress indicators
- [ ] Support for Tana date fields with smart parsing
- [ ] Interactive mode for building nodes
- [ ] Support for reading from files directly (not just stdin)

## Credits

Built for PAI (Personal AI Infrastructure) by Jens-Christian Fischer, 2025.

Inspired by:
- Tana Input API documentation (https://tana.inc/docs/input-api)
- Tana Paste format (https://tana.inc/docs/tana-paste)
- Calendar skill's Tana Paste formatter

## License

MIT
