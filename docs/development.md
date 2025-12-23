# Development Guide

## Building from Source

```bash
# Clone the repository
git clone https://github.com/jcfischer/supertag-cli.git
cd supertag-cli

# Install dependencies
bun install

# Run from source
bun run src/index.ts --help

# Build binaries
bun run build
```

---

## Testing

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

### Test Organization

| Location | Description |
|----------|-------------|
| `tests/*.test.ts` | Fast unit and integration tests |
| `tests/slow/*.test.ts` | Slow tests requiring large workspace data |
| `src/**/*.test.ts` | Component-level tests |

### Slow Tests

Located in `tests/slow/`:

- `large-workspace-indexer.test.ts` - Indexes 1.2M nodes (~53s)
- `real-workspace.test.ts` - Parses full production export (~6s)
- `embed-search-show.test.ts` - Embedding generation and search (~6s)

---

## File Structure

```
supertag-cli/
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
│   ├── embeddings/         # Vector embedding system
│   ├── mcp/                # MCP server source
│   └── config/             # Configuration management
├── tests/                  # Test suites
├── docs/                   # Documentation
└── launchd/                # macOS automation
```

---

## Configuration Paths (XDG Base Directory)

```
~/.config/supertag/           # Config files
~/.local/share/supertag/      # Databases, workspaces
~/.cache/supertag/            # Schema cache
~/Documents/Tana-Export/      # Export files (macOS)
```

View all paths:

```bash
supertag paths
supertag paths --json
```

> **Note**: Uses `supertag` namespace to avoid conflicts with the official Tana app.

---

## Configuration Priority

1. CLI flags (`--token`, `--workspace`)
2. Environment variables (`TANA_API_TOKEN`)
3. Config file (`~/.config/supertag/config.json`)
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

## Performance Benchmarks

| Operation | Performance |
|-----------|-------------|
| Indexing | 107k nodes/second |
| FTS5 Search | < 50ms |
| SQL Queries | < 100ms |
| Database | ~500 MB for 1M nodes |
| Export (large workspace) | 10-15 minutes |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for details on:

- Development setup
- Testing requirements (TDD enforced)
- Pull request process

---

## Security

For security issues, see [SECURITY.md](../SECURITY.md) for our security policy and how to report vulnerabilities.
