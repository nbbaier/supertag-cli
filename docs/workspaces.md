# Workspaces - Multi-Workspace Management

Supertag CLI supports multiple Tana workspaces, allowing you to manage separate knowledge bases independently.

## Quick Start

```bash
# Discover and add workspaces automatically
supertag-export login
supertag-export discover --add

# List configured workspaces
supertag workspace list

# Use a specific workspace
supertag search "meeting" -w work
```

---

## Automatic Discovery (Recommended)

The easiest way to configure workspaces is automatic discovery:

```bash
# Login to Tana
supertag-export login

# Discover all workspaces
supertag-export discover

# Add ALL discovered workspaces at once
supertag-export discover --add
```

This captures the `rootFileId` for each workspace automatically.

---

## Manual Configuration

```bash
# Add a workspace using rootFileId (from supertag-export discover)
supertag workspace add M9rkJkwuED --alias personal
supertag workspace add u-5GVx_8nTUj --alias work

# Set default workspace
supertag workspace set-default personal

# Show workspace details
supertag workspace show personal
```

---

## Using Workspaces

### Per-Command Workspace Selection

Use the `-w` or `--workspace` flag with any command:

```bash
# Search in specific workspace
supertag search "meeting" -w work

# Sync specific workspace
supertag sync index -w personal

# Export specific workspace
supertag-export run -w personal
```

### Batch Operations

```bash
# Sync all workspaces
supertag sync index --all

# Export all enabled workspaces
supertag-export run --all
```

---

## Workspace Storage

Each workspace has its own directory:

```
~/.local/share/supertag/workspaces/
├── main/
│   ├── tana-index.db      # SQLite database
│   ├── schema.json        # Supertag schema cache
│   └── *.lance/           # LanceDB embeddings
├── work/
│   ├── tana-index.db
│   └── ...
└── personal/
    └── ...
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `workspace list` | List all configured workspaces |
| `workspace add <rootFileId> --alias <name>` | Add a new workspace |
| `workspace set-default <alias>` | Set the default workspace |
| `workspace show <alias>` | Show workspace details |
| `workspace remove <alias>` | Remove a workspace |
