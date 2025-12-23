# Embeddings - Vector Semantic Search

Vector embeddings enable semantic search - find nodes by meaning, not just keywords.

## Prerequisites

You need [Ollama](https://ollama.com/) installed and running.

## Quick Start

```bash
# Configure embedding model (bge-m3 recommended)
supertag embed config --model bge-m3

# Generate embeddings
supertag embed generate

# Search by meaning
supertag search "project planning discussions" --semantic
```

---

## Configuration

### Choose a Model

```bash
# Option 1: bge-m3 (RECOMMENDED - best quality)
supertag embed config --model bge-m3

# Option 2: nomic-embed-text (faster, lower quality)
supertag embed config --model nomic-embed-text
```

### Show Current Configuration

```bash
supertag embed config --show
```

---

## Generate Embeddings

```bash
# Generate with smart filtering (default)
supertag embed generate

# Verbose output showing filter details
supertag embed generate --verbose

# Generate for specific supertag only
supertag embed generate --tag meeting
```

### Content Filtering Options

```bash
# Customize minimum text length
supertag embed generate --min-length 20

# Bypass all filters (include everything)
supertag embed generate --include-all

# Include system docTypes
supertag embed generate --include-system
```

---

## Semantic Search

```bash
# Basic semantic search
supertag search "project planning discussions" --semantic

# Limit results
supertag search "authentication issues" --semantic --limit 20

# Show full node details
supertag search "meeting notes" --semantic --show

# Include children
supertag search "project ideas" --semantic --show --depth 1

# JSON output
supertag search "tasks" --semantic --show --json
```

---

## Statistics

```bash
# Show embedding statistics
supertag stats --embed

# View content filtering breakdown
supertag stats --filter
```

---

## Smart Content Filtering

By default, `embed generate` applies intelligent filtering to focus on meaningful content:

| Filter | Default | Effect |
|--------|---------|--------|
| Min length | 15 chars | Excludes noise like "Yes.", "Mhm.", "*" |
| Timestamps | Excluded | Removes 1970-01-01... import artifacts |
| System types | Excluded | Removes tuple, metanode, viewDef, etc. |

This reduces embedding workload by ~47% while preserving search quality.

---

## Entity Detection

Entities are "interesting" nodes in Tana - things worth finding. They automatically bypass the minLength filter because short-named entities like "Animal #topic" are still valuable for search.

**Detection priority (in order):**

1. `props._entityOverride` - Explicit user override
2. `props._flags % 2 === 1` - Automatic entity flag from Tana export
3. Library items (`_ownerId` ends with `_STASH`)
4. Tagged items (has any supertag applied)

```bash
# View entity detection breakdown
supertag stats --filter
```

---

## Available Providers

| Provider | Server Required | Models |
|----------|----------------|--------|
| **Ollama** | Yes (local) | bge-m3 (1024d), nomic-embed-text (768d), all-minilm (384d), mxbai-embed-large (1024d) |
| **Transformers.js** | No | Xenova/all-MiniLM-L6-v2 (384d), bge-small-en-v1.5 (384d), bge-base-en-v1.5 (768d) |

---

## Model Recommendation

We recommend **bge-m3** for best semantic search quality:

- 3x better differentiation of short text (names, titles) vs nomic-embed-text
- More relevant search results with proper similarity scoring
- Higher dimensional embeddings (1024d) capture more semantic nuance

```bash
# Pull the model in Ollama first
ollama pull bge-m3

# Then configure
supertag embed config --model bge-m3
```

---

## Storage

Embeddings are stored in LanceDB format (`.lance` directory next to the SQLite database), providing cross-platform support without native extensions.

---

## Known Limitations

Results may occasionally include deleted nodes because Tana's JSON export doesn't include comprehensive deletion metadata. Nodes with `_TRASH` ancestors are filtered, but some deletion patterns cannot be detected from exports.
