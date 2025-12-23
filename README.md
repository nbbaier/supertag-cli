# Supertag CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/jcfischer/supertag-cli/actions/workflows/test.yml/badge.svg)](https://github.com/jcfischer/supertag-cli/actions/workflows/test.yml)

**Complete Tana integration**: Query, write, search, and automate your Tana workspace from the command line.

## Three-Tool Architecture

| Tool | Size | Purpose |
|------|------|---------|
| `supertag` | ~57 MB | Main CLI - query, write, sync, server |
| `supertag-export` | ~59 MB | Browser automation for exports |
| `supertag-mcp` | ~60 MB | MCP server for AI tool integration |

**Downloads**: [GitHub Releases](https://github.com/jcfischer/supertag-cli/releases) (macOS ARM64/Intel, Linux x64, Windows x64)

---

## Quick Start

### 1. Download and Extract

```bash
unzip supertag-cli-vX.Y.Z-macos-arm64.zip
cd supertag-cli-macos-arm64

# macOS: Remove quarantine
xattr -d com.apple.quarantine ./supertag ./supertag-mcp ./supertag-export
```

### 2. Configure API Token

```bash
export TANA_API_TOKEN="your_token_here"
# Get token from: https://app.tana.inc/?bundle=settings&panel=api
```

### 3. Login and Export

```bash
./supertag-export login      # Opens browser for Tana login
./supertag-export discover   # Find your workspaces
./supertag-export run        # Export your data
./supertag sync index        # Index the export
```

### 4. Start Using

```bash
./supertag search "meeting"                    # Full-text search
./supertag search "project ideas" --semantic   # Semantic search
./supertag create todo "Buy groceries"         # Create nodes
./supertag stats                               # Database stats
```

---

## Capabilities

### READ - Query Workspace

```bash
supertag search "project"                    # Full-text search
supertag search "project" --semantic         # Semantic search
supertag search "todo" --tag todo            # Find by supertag
supertag nodes show <id> --depth 3           # Node contents
supertag tags top                            # Most used tags
supertag stats                               # Statistics
```

### WRITE - Create Nodes

```bash
supertag create todo "Task name" --status active
supertag create meeting "Team Standup" --date 2025-12-06
supertag create video,towatch "Tutorial" --url https://example.com
```

### EXPORT - Automated Backup

```bash
supertag-export login        # First-time login
supertag-export run          # Export workspace
supertag-export run --all    # Export all workspaces
```

See [Export Documentation](./docs/export.md) for details.

### EMBED - Semantic Search

```bash
supertag embed config --model bge-m3    # Configure
supertag embed generate                  # Generate embeddings
supertag search "ideas" --semantic       # Search by meaning
```

See [Embeddings Documentation](./docs/embeddings.md) for details.

### SERVER - Webhook API

```bash
supertag server start --port 3100 --daemon
curl http://localhost:3100/search -d '{"query": "meeting"}'
```

See [Webhook Server Documentation](./docs/WEBHOOK-SERVER.md) for API reference.

### MCP - AI Tool Integration

Integrate with Claude Desktop, ChatGPT, Cursor, VS Code, and other MCP-compatible AI tools.

```json
{
  "mcpServers": {
    "tana": { "command": "/path/to/supertag-mcp" }
  }
}
```

See [MCP Documentation](./docs/mcp.md) for setup guides.

### WORKSPACES - Multi-Workspace

```bash
supertag workspace list
supertag workspace add <rootFileId> --alias work
supertag search "meeting" -w work
```

See [Workspaces Documentation](./docs/workspaces.md) for details.

---

## Installation

### Option A: Symlink (Recommended)

```bash
sudo ln -s $(pwd)/supertag /usr/local/bin/supertag
sudo ln -s $(pwd)/supertag-export /usr/local/bin/supertag-export
sudo ln -s $(pwd)/supertag-mcp /usr/local/bin/supertag-mcp
```

### Option B: Add to PATH

```bash
echo 'export PATH="$PATH:/path/to/supertag-cli"' >> ~/.zshrc
source ~/.zshrc
```

### Playwright (Required for Export)

```bash
bun install
# Chromium auto-installs on first supertag-export run
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [MCP Integration](./docs/mcp.md) | AI tool setup (Claude, ChatGPT, Cursor, etc.) |
| [Embeddings](./docs/embeddings.md) | Semantic search configuration |
| [Webhook Server](./docs/WEBHOOK-SERVER.md) | HTTP API reference |
| [Workspaces](./docs/workspaces.md) | Multi-workspace management |
| [Export](./docs/export.md) | Automated backup and scheduling |
| [Development](./docs/development.md) | Building, testing, contributing |
| [Launchd Setup](./docs/LAUNCHD-SETUP.md) | macOS auto-start configuration |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "API token not configured" | `export TANA_API_TOKEN="your_token"` |
| "Database not found" | `supertag sync index` |
| "Chromium not found" | `supertag-export setup` |

---

## Performance

| Operation | Performance |
|-----------|-------------|
| Indexing | 107k nodes/second |
| FTS5 Search | < 50ms |
| Database | ~500 MB for 1M nodes |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and pull request guidelines.

## Security

See [SECURITY.md](SECURITY.md) for security policy and vulnerability reporting.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built by Jens-Christian Fischer, 2025.
