# Supertag CLI

**Complete Tana integration with seven powerful capabilities**: **MCP** (AI tool integration), **EMBED** (semantic vector search), INTERACTIVE (webhook server), WRITE (Input API), READ (query exports), EXPORT (automated backup), and WORKSPACES (multi-workspace management).

**✨ New in v0.9.8:** Semantic search now returns proper Tana references with table format, improved deletion filtering, and parent context for every result.

## Three-Tool Architecture

Supertag CLI is distributed as standalone executables (no runtime required):

| Tool | Size | Purpose |
|------|------|---------|
| `supertag` | ~57 MB | Main CLI - query, write, sync, server, workspaces |
| `supertag-export` | ~59 MB | Browser automation for exports (Playwright) |
| `supertag-mcp` | ~60 MB | MCP server for AI tool integration |

Platform-specific binaries are available for:
- **macOS Apple Silicon (M1/M2/M3)**: `supertag-cli-v0.8.0-macos-arm64.zip`
- **macOS Intel**: `supertag-cli-v0.8.0-macos-x64.zip`
- **Linux x64**: `supertag-cli-v0.8.0-linux-x64.zip`
- **Windows x64**: `supertag-cli-v0.8.0-windows-x64.zip`

---

## Quick Start

### 1. Download and Extract

```bash
# Download the appropriate version for your platform
unzip supertag-cli-v0.8.0-macos-arm64.zip
cd supertag-cli-macos-arm64
```

### 2. Configure API Token

```bash
# Get token from: https://app.tana.inc/?bundle=settings&panel=api
export TANA_API_TOKEN="your_token_here"
# Or: supertag config --token your_token
```

### 3. Try It Out

```bash
# Create a todo
./supertag create todo "Buy groceries" --status active

# Search your workspace (requires indexed export)
./supertag query search "meeting"

# Show database stats
./supertag query stats
```

---

## Installation

### Option A: Symlink to /usr/local/bin (Recommended)

```bash
sudo ln -s $(pwd)/supertag /usr/local/bin/supertag
sudo ln -s $(pwd)/export/supertag-export /usr/local/bin/supertag-export
sudo ln -s $(pwd)/mcp/supertag-mcp /usr/local/bin/supertag-mcp
```

### Option B: Add to PATH

```bash
echo 'export PATH="$PATH:/path/to/supertag-cli"' >> ~/.zshrc
source ~/.zshrc
```

### Install Playwright (Required for Export Tool)

The export tool requires Playwright for browser automation:

```bash
cd export
npm install
```

**Note**: Chromium browser (~300 MB) auto-downloads on first `supertag-export` run.

---

## Capabilities

### WRITE - Post Data to Tana

```bash
# Create any supertag node dynamically
supertag create todo "Task name" --status active --duedate 2025-12-31
supertag create meeting "Team Standup" --date 2025-12-06
supertag create research "AI Summary" --topic AI --period 2025-11

# Multiple supertags
supertag create video,towatch "Tutorial" --url https://example.com

# From JSON
echo '{"name": "Note", "tag": "note"}' | supertag post

# Format for manual paste
echo '{"name": "Task"}' | supertag format
```

### READ - Query Workspace Exports

```bash
# First, index a Tana export
supertag sync index

# Search (resolves to tagged ancestors)
supertag query search "project" --limit 10

# Find by supertag
supertag query tagged meeting --limit 5

# Show full node contents
supertag show tagged project --limit 3
supertag show node <node-id>

# Show node with depth traversal (traverse children)
supertag show node <node-id> -d 3          # 3 levels deep
supertag show node <node-id> -d 2 --json   # JSON output with depth

# Statistics
supertag query stats
supertag query top-tags --limit 20
```

### EXPORT - Automated Backup (via `supertag-export`)

```bash
# First-time login (opens browser, saves session)
supertag-export login

# Check status and auth state
supertag-export status

# Run export (default workspace)
supertag-export run

# Export with verbose output (shows auth method)
supertag-export run -v

# Export all enabled workspaces
supertag-export run --all

# Export specific workspace
supertag-export run -w personal
```

**Authentication Flow** (automatic, no user action needed):
1. **Cached token** (~0.7s) - Uses previously saved token
2. **API refresh** (~1.0s) - Refreshes expired token via Firebase API
3. **Browser extraction** (~8s) - Falls back to browser if needed

The `-v` flag shows which auth method was used.

### INTERACTIVE - Webhook Server

```bash
# Start server
supertag server start --port 3100

# Start as daemon
supertag server start --port 3100 --daemon

# Check status
supertag server status

# Stop
supertag server stop
```

**API Endpoints** (all return Tana Paste format):
- `GET /health` - Health check
- `POST /search` - Full-text search
- `POST /semantic-search` - Vector similarity search (returns table with Node, Ancestor, Similarity columns)
- `GET /stats` - Database statistics
- `GET /embed-stats` - Embedding statistics
- `POST /tags` - Top supertags
- `POST /nodes` - Find nodes
- `POST /refs` - Reference graph

**Semantic Search Table Format:**

The `/semantic-search` endpoint returns results as a Tana table:

```
- Semantic Search Results %%view:table%%
  - [[Node Name^nodeID]]
    - Ancestor:: [[Parent Node^parentID]]
    - Similarity:: 85%
  - [[Another Node^nodeID2]]
    - Ancestor:: [[Parent^parentID2]]
    - Similarity:: 72%
```

Each result includes:
- **Node**: Reference to the matching node using `[[Name^nodeID]]` syntax
- **Ancestor**: Parent or tagged ancestor for context
- **Similarity**: Match percentage (0-100%)

Example API call:
```bash
curl -X POST http://localhost:3100/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"query": "project planning", "limit": 10}'
```

See [WEBHOOK-SERVER.md](./WEBHOOK-SERVER.md) for detailed API documentation.

### EMBED - Vector Semantic Search

Vector embeddings enable semantic search - find nodes by meaning, not just keywords.

```bash
# Configure embedding provider (choose one)

# Option 1: Ollama with mxbai-embed-large (RECOMMENDED - best quality)
supertag embed config --provider ollama --model mxbai-embed-large

# Option 2: Ollama with nomic-embed-text (faster, lower quality)
supertag embed config --provider ollama --model nomic-embed-text

# Option 3: Transformers.js (no server required, for getting started)
supertag embed config --provider transformers --model Xenova/all-MiniLM-L6-v2

# Show current configuration
supertag embed config --show

# Generate embeddings (smart filtering applied by default)
supertag embed generate

# Generate with verbose output showing filter details
supertag embed generate --verbose

# Generate for specific supertag only
supertag embed generate --tag meeting

# Customize content filtering
supertag embed generate --min-length 20      # Only nodes >= 20 chars
supertag embed generate --include-all        # Bypass all filters
supertag embed generate --include-system     # Include system docTypes

# View filtering statistics
supertag embed filter-stats

# Semantic search
supertag embed search "project planning discussions"
supertag embed search "authentication issues" --limit 20

# Show full node details with search results
supertag embed search "meeting notes" --show
supertag embed search "project ideas" --show --depth 1    # Include children

# JSON output with full node contents
supertag embed search "tasks" --show --format json

# Show embedding statistics
supertag embed stats

# Note: Results may occasionally include deleted nodes because Tana's JSON export
# doesn't include comprehensive deletion metadata. Nodes with _TRASH ancestors
# are filtered, but some deletion patterns cannot be detected from exports.
```

**Smart Content Filtering:**

By default, `embed generate` applies intelligent filtering to focus on meaningful content:

| Filter | Default | Effect |
|--------|---------|--------|
| Min length | 15 chars | Excludes noise like "Yes.", "Mhm.", "*" |
| Timestamps | Excluded | Removes 1970-01-01... import artifacts |
| System types | Excluded | Removes tuple, metanode, viewDef, etc. |

**Entity Detection:**

Entities are "interesting" nodes in Tana - things worth finding. They automatically bypass the minLength filter because short-named entities like "Animal #topic" are still valuable for search.

Entity detection priority (in order):
1. `props._entityOverride` - Explicit user override
2. `props._flags % 2 === 1` - Automatic entity flag from Tana export
3. Library items (`_ownerId` ends with `_STASH`)
4. Tagged items (has any supertag applied)

Use `embed filter-stats` to see entity detection breakdown:

```bash
supertag embed filter-stats
# Shows: With override, Automatic (_flags), Tagged items, Library items
```

This reduces embedding workload by ~47% while preserving semantic search quality. Use `--include-all` to bypass all filters if needed.

**Available Providers:**

| Provider | Server Required | Models |
|----------|----------------|--------|
| **Ollama** | Yes (local server) | **mxbai-embed-large (1024d)** - recommended, nomic-embed-text (768d), all-minilm (384d), bge-m3 (1024d) |
| **Transformers.js** | No (runs locally) | Xenova/all-MiniLM-L6-v2 (384d), bge-small-en-v1.5 (384d), bge-base-en-v1.5 (768d) |

**Model Recommendation:**

We recommend **mxbai-embed-large** for best semantic search quality. In A/B testing:
- 3x better differentiation of short text (names, titles) vs nomic-embed-text
- More relevant search results with proper similarity scoring
- Higher dimensional embeddings (1024d) capture more semantic nuance

To use mxbai-embed-large, first pull the model in Ollama:
```bash
ollama pull mxbai-embed-large
```

Embeddings are stored in LanceDB format (`.lance` directory next to the SQLite database), providing cross-platform support without any native extensions.

---

### WORKSPACES - Multi-Workspace Management

**Automatic Discovery (Recommended):**

```bash
# Login and discover all workspaces automatically
supertag-export login
supertag-export discover --add

# This captures the rootFileId for each workspace
```

**Manual Configuration:**

```bash
# Add workspaces using rootFileId (from supertag-export discover)
supertag workspace add M9rkJkwuED --alias personal
supertag workspace add 7e25I56wgQ --alias work

# List and manage
supertag workspace list
supertag workspace set-default personal
supertag workspace show personal

# Use specific workspace
supertag query search "meeting" -w work
supertag sync index -w personal

# Batch operations
supertag sync index --all
supertag-export run --all
```

### MCP - AI Tool Integration

The MCP (Model Context Protocol) server enables Tana integration with AI tools like ChatGPT Desktop, Cursor, VS Code Copilot, Claude Code, and other MCP-compatible applications. MCP is the emerging industry standard for AI-tool integration, backed by Anthropic, OpenAI, Google, and Microsoft.

**What is MCP?** Think of it as "USB-C for AI" - a universal standard that lets any AI assistant access your Tana data. The `supertag-mcp` binary runs locally on your machine as a subprocess - no server setup, no cloud hosting, no network exposure needed.

**Available Tools:**
| Tool | Description | Example |
|------|-------------|---------|
| `tana_search` | Full-text search across workspace | "Search my Tana for project notes" |
| `tana_semantic_search` | Vector similarity search (requires embeddings) | "Find notes about knowledge management" |
| `tana_tagged` | Find nodes by supertag | "Find all my todos" |
| `tana_stats` | Database statistics | "How many nodes in my Tana?" |
| `tana_supertags` | List all supertags | "What supertags do I have?" |
| `tana_node` | Get node contents with depth | "Show node abc123 with children" |
| `tana_create` | Create new nodes with references | "Create a todo linked to node abc123" |
| `tana_sync` | Trigger reindex or status | "Reindex my Tana database" |

**Important Note on References:**
The Tana Input API does NOT support inline reference syntax (`[[text^nodeId]]`) in node names. If you include such syntax, it will appear as plain text, not as a clickable link. To create nodes with references to other nodes, use the `children` parameter with the node ID:

```json
{
  "supertag": "todo",
  "name": "Follow up on feedback form",
  "children": [{"name": "NetSec Feedback Form", "id": "dvpAO46vtnrx"}]
}
```

This creates a todo with a child reference that links to the existing node.

**Prerequisites:**
1. Indexed database: `supertag sync index`
2. API token (for `tana_create`): `supertag config --token YOUR_TOKEN`
3. Schema registry (for `tana_create`): `supertag schema sync`

#### Setup for Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp",
      "env": { "TANA_WORKSPACE": "personal" }
    }
  }
}
```

#### Setup for Claude Code

Add to `~/.claude/mcp.json`:
```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp",
      "env": { "TANA_WORKSPACE": "personal" }
    }
  }
}
```

#### Setup for ChatGPT Desktop

**macOS**: `~/Library/Application Support/ChatGPT/chatgpt_config.json`
**Windows**: `%APPDATA%\ChatGPT\chatgpt_config.json`

```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp"
    }
  }
}
```

#### Setup for Cursor IDE

Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp"
    }
  }
}
```

Then: Cursor Settings → Features → MCP → Enable

#### Setup for VS Code + Copilot

Add to `.vscode/mcp.json`:
```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp"
    }
  }
}
```

#### Setup for Windsurf

Add to Settings → MCP Servers:
```json
{
  "tana": {
    "command": "/path/to/supertag-mcp"
  }
}
```

#### Windows Configuration

Use full path with double backslashes:
```json
{
  "mcpServers": {
    "tana": {
      "command": "C:\\path\\to\\supertag-mcp.exe"
    }
  }
}
```

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TANA_WORKSPACE` | Workspace alias | Default workspace |
| `DEBUG` | Enable debug logging | `false` |

#### Testing MCP Setup

```bash
npx @modelcontextprotocol/inspector /path/to/supertag-mcp
```

This opens a web UI to test tools interactively.

**How It Works:**
- Runs locally as subprocess (no network server)
- Uses stdin/stdout JSON-RPC (no ports)
- Reads local SQLite database
- Write ops use your Tana API token
- 100% private - all data stays on your machine

**Example AI Queries:**
- "Search my Tana for notes about authentication"
- "Find all my todos in Tana"
- "What supertags do I have?"
- "Show me the node with ID abc123"
- "Create a new todo called 'Review pull request'"
- "Reindex my Tana database"

**Troubleshooting:**
- Tools not appearing? Verify path is absolute, restart app
- Database not found? Run `supertag sync index`
- Schema empty? Run `supertag schema sync`
- Debug mode: Add `"DEBUG": "true"` to env

#### Setup for Local LLMs (Ollama)

You can use Supertag MCP tools with local LLMs running in Ollama. This provides completely offline, private AI access to your Tana data.

**Prerequisites:**
1. [Ollama](https://ollama.com) installed and running
2. A tool-calling capable model (e.g., `qwen2.5:7b`, `llama3.1`, `mistral`)
3. [mcphost](https://github.com/mark3labs/mcphost) - MCP client for Ollama

**Step 1: Install mcphost**

```bash
# macOS
brew install mcphost

# Or build from source
go install github.com/mark3labs/mcphost@latest
```

**Step 2: Configure MCP servers**

Create `~/.mcp.json`:
```json
{
  "mcpServers": {
    "supertag": {
      "command": "/path/to/supertag-mcp",
      "args": []
    },
    "datetime": {
      "command": "/path/to/datetime-mcp",
      "args": []
    }
  }
}
```

The `datetime` MCP provides `get_current_datetime` and `get_date_info` tools - essential for local LLMs that lack real-time awareness.

**Step 3: Pull a tool-calling model**

```bash
ollama pull qwen2.5:7b
```

**Step 4: Run mcphost**

Interactive mode:
```bash
mcphost --quiet -m ollama:qwen2.5:7b
```

Single prompt mode:
```bash
mcphost --quiet -m ollama:qwen2.5:7b -p "List the top 5 supertags in workspace 'main'"
```

> **Tip:** Use `--quiet` to reduce visual noise from MCP server initialization messages.

**Example Output:**
```
Executing supertag__tana_supertags...

The top 5 supertags in the 'main' workspace are:
1. meeting (2190 nodes)
2. todo (1847 nodes)
3. contact (956 nodes)
...
```

**Supported Models:**
- `qwen2.5:7b` (recommended - fast and reliable tool calling)
- `llama3.1:8b` (good alternative)
- `mistral:7b` (works but less reliable)
- `deepseek-r1` (powerful but slower)

**Note:** Smaller models (1B-3B) may struggle with tool calling. 7B+ models work best.

**Model Comparison Test Results (December 2025):**

| Model | Tool Execution | Date Awareness | Result |
|-------|----------------|----------------|--------|
| **Claude Code** | ✅ Correct | ✅ Real-time | **5 meetings** (actual today) |
| `qwen2.5:7b` | ✅ Works | ❌ Training cutoff | Needs explicit date |
| `llama3.1:8b` | ✅ Works | ❌ Training cutoff | Needs explicit date |
| `qwen2.5:14b` | ❌ Failed | N/A | Outputs as text |
| `mistral:7b` | ❌ Failed | N/A | Doesn't execute |

**Key Finding:** Local LLMs lack date awareness - they use training cutoff dates (e.g., 2023-10-17) when asked "for today". Always provide explicit dates or use `datetime` MCP's `get_current_datetime` first.

**Recommendation:** Use Claude Code for date-aware queries, or `qwen2.5:7b` with explicit dates.

---

## Configuration

### Paths (XDG Base Directory)

```
~/.config/supertag/           # Config files
~/.local/share/supertag/      # Databases, workspaces
~/.cache/supertag/            # Schema cache
~/Documents/Tana-Export/      # Export files (macOS)
```

> **Note**: Uses `supertag` namespace to avoid conflicts with the official Tana app.

### View All Paths

```bash
supertag paths
supertag paths --json
```

### Priority Order

1. CLI flags (`--token`, `--workspace`)
2. Environment variables (`TANA_API_TOKEN`)
3. Config file (`~/.config/tana/config.json`)
4. Default workspace (if configured)

---

## Schema Registry

The schema registry enables dynamic node creation for any supertag:

```bash
# Sync schema from Tana export
supertag schema sync

# List all supertags
supertag schema list

# Show fields for a supertag
supertag schema show todo

# Search supertags
supertag schema search meeting
```

---

## Daily Automation

### Combined Export + Sync + Cleanup

```bash
./tana-daily               # Export + index + cleanup
./tana-daily --export      # Export only
./tana-daily --sync        # Index only
./tana-daily --cleanup     # Cleanup only (remove old exports)
./tana-daily --no-cleanup  # Export + index without cleanup
./tana-daily --all         # All workspaces
```

### Export Cleanup

Automatically remove old export files to save disk space:

```bash
# Show what would be deleted (dry run)
supertag sync cleanup --dry-run

# Keep last 7 files (default)
supertag sync cleanup

# Keep custom number of files
supertag sync cleanup --keep 5

# Clean up all workspaces
supertag sync cleanup --all
```

**Configuration** (in `~/.config/supertag/config.json`):

```json
{
  "cleanup": {
    "keepCount": 7,
    "autoCleanup": false
  }
}
```

### macOS LaunchAgent (6 AM daily)

```bash
cp launchd/ch.invisible.supertag-daily.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/ch.invisible.supertag-daily.plist
```

---

## Performance

| Operation | Performance |
|-----------|-------------|
| Indexing | 107k nodes/second |
| FTS5 Search | < 50ms |
| SQL Queries | < 100ms |
| Database | ~500 MB for 1M nodes |
| Export (large workspace) | 10-15 minutes |

---

## File Structure

```
tana/
├── supertag                # Main CLI executable (~57 MB)
├── package.json            # Main dependencies
├── export/                 # Separate package for browser exports
│   ├── supertag-export     # Export CLI (~59 MB)
│   ├── package.json        # Playwright dependency
│   └── index.ts            # Export CLI source
├── mcp/                    # MCP server for AI tools
│   └── supertag-mcp        # MCP server executable (~60 MB)
├── src/
│   ├── index.ts            # Main CLI entry point
│   ├── commands/           # CLI commands
│   ├── schema/             # Schema registry
│   ├── db/                 # SQLite indexer
│   ├── query/              # Query engine
│   ├── server/             # Webhook server
│   ├── embeddings/         # Vector embedding system (resona/LanceDB)
│   │   ├── tana-embedding-service.ts  # Resona wrapper for Tana
│   │   ├── embed-config-new.ts        # Model configuration
│   │   ├── contextualize.ts           # Node context building
│   │   ├── content-filter.ts          # Node filtering
│   │   ├── search-filter.ts           # Search result filtering
│   │   └── ancestor-resolution.ts     # Ancestor context lookup
│   ├── mcp/                # MCP server source
│   │   ├── index.ts        # MCP server entry point
│   │   ├── schemas.ts      # Zod schemas for tools
│   │   └── tools/          # Tool implementations
│   └── config/             # Configuration management
└── launchd/                # macOS automation
```

---

## Documentation

- **[SKILL.md](./SKILL.md)** - Complete documentation with all options
- **[WEBHOOK-SERVER.md](./WEBHOOK-SERVER.md)** - API reference

---

## Troubleshooting

### "API token not configured"

```bash
export TANA_API_TOKEN="your_token"
# Or: supertag config --token your_token
```

### "Database not found"

```bash
supertag sync index  # Index a Tana export first
```

### "Chromium not found" (supertag-export)

Chromium auto-installs on first run. If it fails:

```bash
cd export && npx playwright install chromium
```

---

## Development

### Testing

Tests are split into fast and slow suites for efficient development:

```bash
# Fast tests (~10s) - run frequently during development
bun run test

# Slow tests only (~60s) - large workspace integration tests
bun run test:slow

# Full test suite (~110s) - run before committing
bun run test:full

# Alias for full suite
bun run precommit
```

**Test Organization:**
- `tests/*.test.ts` - Fast unit and integration tests
- `tests/slow/*.test.ts` - Slow tests requiring large workspace data
- `src/**/*.test.ts` - Component-level tests

**Slow tests (in `tests/slow/`):**
- `large-workspace-indexer.test.ts` - Indexes 1.2M nodes (~53s)
- `real-workspace.test.ts` - Parses full production export (~6s)
- `embed-search-show.test.ts` - Embedding generation and search (~6s)

---

## Credits

Built for PAI (Personal AI Infrastructure) by Jens-Christian Fischer, 2025.

## License

MIT
