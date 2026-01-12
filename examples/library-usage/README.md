# Supertag Library Usage Example

This example demonstrates how to use `supertag-cli` as a library in TypeScript applications, without using the CLI interface.

## Features Demonstrated

1. **Database Queries** - Query the local SQLite database directly
2. **API Operations** - Create nodes using the Tana Input API
3. **Workspace Resolution** - Resolve workspace paths and configuration
4. **Batch Operations** - Multi-node operations with batching

## Prerequisites

1. **Supertag CLI installed and configured**
   ```bash
   supertag sync index   # Populate the database
   ```

2. **Bun runtime**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

## Installation

```bash
cd examples/library-usage
bun install
```

## Usage

```bash
# Run the example
bun run start

# Development mode with watch
bun run dev

# Type checking
bun run typecheck
```

## Code Examples

### Database Query

```typescript
import { withDatabase, getDatabasePath } from 'supertag-cli';

const dbPath = getDatabasePath();
withDatabase(dbPath, (db) => {
  const results = db.query(`
    SELECT n.id, n.name FROM nodes n LIMIT 10
  `).all();
  console.log(results);
});
```

### Create Node via API

```typescript
import { TanaApiClient, getConfig } from 'supertag-cli';

const config = getConfig();
const client = new TanaApiClient(config.apiToken, config.apiEndpoint);

await client.postNodes('INBOX', [{
  name: 'New Task',
  supertags: [{ id: 'todo' }],
  children: [{ name: 'Task description' }]
}]);
```

### Workspace Resolution

```typescript
import { resolveWorkspaceContext } from 'supertag-cli';

const workspace = resolveWorkspaceContext();
console.log(workspace.dbPath);     // Database path
console.log(workspace.exportDir);  // Export directory
console.log(workspace.alias);      // Workspace name
```

### Batch Operations

```typescript
import { batchGetNodes } from 'supertag-cli';

const results = await batchGetNodes({
  nodeIds: ['id1', 'id2', 'id3'],
  depth: 2,
  workspace: 'main'
});

results.forEach(({ id, node, error }) => {
  if (node) {
    console.log(`${id}: ${node.name}`);
  } else {
    console.error(`${id}: ${error}`);
  }
});
```

## Available Exports

See the full API reference in [docs/LIBRARY.md](../../docs/LIBRARY.md) or check `src/lib.ts` for all available exports:

- **API Client**: `TanaApiClient`, rate limiting
- **Database**: `withDatabase`, `withTransaction`, query builders
- **Configuration**: `getConfig`, workspace resolution
- **Services**: batch operations, graph traversal, node builder
- **Types**: All TypeScript interfaces and types
- **Utilities**: error handling, formatters, logger

## Notes

- The example uses the same database as the CLI (`~/.local/share/supertag/workspaces/main/tana-index.db`)
- API operations require a valid `TANA_API_TOKEN` environment variable
- All database operations are read-only by default
- See the main README for full CLI documentation

## License

MIT - Part of the supertag-cli project.
