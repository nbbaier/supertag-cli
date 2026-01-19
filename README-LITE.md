# Supertag CLI Lite

A lightweight build of supertag-cli without embedding support, designed for use in environments where native modules cause issues (e.g., Raycast extensions, Docker containers).

## What's Excluded

The lite build excludes:
- `embed` command (semantic search indexing)
- `server` command (webhook server with semantic search)
- `@lancedb/lancedb` native dependency

## What's Included

All core functionality remains:
- ✅ `create` - Create nodes with any supertag
- ✅ `post` - Post Tana Paste to Tana
- ✅ `tags` - List and query supertags
- ✅ `fields` - Query field values
- ✅ `search` - Search nodes (text-based, not semantic)
- ✅ `nodes` - Show node details
- ✅ `stats` - Database statistics
- ✅ `sync` - Index Tana exports
- ✅ `batch` - Batch operations
- ✅ All other non-embedding commands

## Building

```bash
bun run build:lite
```

This generates `supertag-lite` binary that can be compiled without issues.

## Why?

The full supertag binary includes `@lancedb/lancedb`, a native module that causes compilation issues with Bun's `--compile` feature on some systems (exit code 137). The lite build removes this dependency while keeping all essential functionality.

## Use Cases

- Raycast extensions
- Docker containers
- CI/CD pipelines
- Systems without native module support
- Lightweight installations where embeddings aren't needed
