# Supertag CLI - Library Mode Documentation

This document describes how to use `supertag-cli` as a library in TypeScript applications.

## Installation

### As a Dependency

```bash
# Using npm
npm install supertag-cli

# Using bun
bun add supertag-cli

# Using yarn
yarn add supertag-cli
```

### From Source (Development)

```bash
# Clone and link locally
git clone https://github.com/jcfischer/supertag-cli.git
cd supertag-cli
npm link

# In your project
npm link supertag-cli
```

## Quick Start

```typescript
import {
  TanaApiClient,
  withDatabase,
  getDatabasePath,
  getConfig,
} from 'supertag-cli';

// Query the database
const dbPath = getDatabasePath();
withDatabase(dbPath, (db) => {
  const results = db.query('SELECT * FROM nodes LIMIT 10').all();
  console.log(results);
});

// Use the API
const config = getConfig();
const client = new TanaApiClient(config.apiToken, config.apiEndpoint);
await client.postNodes('INBOX', [{ name: 'New node' }]);
```

## Core Modules

### 1. API Client

Create and post nodes to Tana via the Input API.

```typescript
import { TanaApiClient, type TanaApiNode } from 'supertag-cli';

const client = new TanaApiClient(apiToken, apiEndpoint);

// Create a simple node
await client.postNodes('INBOX', [{
  name: 'Meeting Notes',
  supertags: [{ id: 'meeting' }],
}]);

// Create a node with fields and children
await client.postNodes('INBOX', [{
  name: 'Project Review',
  supertags: [{ id: 'meeting' }],
  children: [
    {
      type: 'field',
      attributeId: 'Status',
      children: [{ name: 'Completed' }],
    },
    { name: 'Agenda item 1' },
    { name: 'Agenda item 2' },
  ],
}]);
```

### 2. Database Access

Query the local SQLite database populated by `supertag sync index`.

```typescript
import {
  withDatabase,
  withTransaction,
  getDatabasePath,
  type DatabaseContext,
} from 'supertag-cli';

// Simple query
withDatabase(getDatabasePath(), (db) => {
  const nodes = db.query('SELECT * FROM nodes WHERE name LIKE ?').all('%todo%');
  return nodes;
});

// Transaction for multiple operations
withTransaction(getDatabasePath(), (db) => {
  db.query('INSERT INTO ...').run();
  db.query('UPDATE ...').run();
});

// Workspace-specific database
import { withWorkspaceDatabase } from 'supertag-cli';

withWorkspaceDatabase({ workspace: 'work' }, (db) => {
  const results = db.query('SELECT * FROM nodes').all();
  return results;
});
```

### 3. Configuration

Access and manage configuration.

```typescript
import {
  getConfig,
  ConfigManager,
  getDatabasePath,
  resolveWorkspaceContext,
  type ResolvedWorkspace,
} from 'supertag-cli';

// Get current configuration
const config = getConfig();
console.log(config.apiToken);
console.log(config.apiEndpoint);

// Resolve workspace paths
const workspace: ResolvedWorkspace = resolveWorkspaceContext({ 
  workspace: 'main' 
});
console.log(workspace.dbPath);
console.log(workspace.exportDir);
console.log(workspace.schemaPath);

// Get database path
const dbPath = getDatabasePath(); // Uses default workspace
```

### 4. Batch Operations

Fetch or create multiple nodes efficiently.

```typescript
import {
  batchGetNodes,
  batchCreateNodes,
  type BatchGetRequest,
  type BatchCreateRequest,
} from 'supertag-cli';

// Fetch multiple nodes
const getRequest: BatchGetRequest = {
  nodeIds: ['id1', 'id2', 'id3'],
  depth: 2,
  workspace: 'main',
};

const results = await batchGetNodes(getRequest);
results.forEach(({ id, node, error }) => {
  if (node) {
    console.log(`${id}: ${node.name}`);
  } else {
    console.error(`${id}: ${error}`);
  }
});

// Create multiple nodes
const createRequest: BatchCreateRequest = {
  nodes: [
    { supertag: 'todo', name: 'Task 1' },
    { supertag: 'todo', name: 'Task 2' },
  ],
  target: 'INBOX',
  dryRun: false,
};

const summary = await batchCreateNodes(createRequest);
console.log(`Created: ${summary.created} nodes`);
```

### 5. Graph Traversal

Find related nodes through references and relationships.

```typescript
import {
  GraphTraversalService,
  type RelatedQuery,
} from 'supertag-cli';

const service = new GraphTraversalService(dbPath);

const query: RelatedQuery = {
  nodeId: 'abc123',
  direction: 'both',
  types: ['reference', 'field'],
  depth: 2,
  limit: 50,
};

const result = await service.traverse(query, 'main');
console.log(`Found ${result.count} related nodes`);
result.related.forEach((node) => {
  console.log(`${node.name} (${node.relationship.type})`);
});
```

### 6. Query Builders

Build safe SQL queries with pagination and filtering.

```typescript
import {
  buildPagination,
  buildOrderBy,
  buildWhereClause,
  type PaginationOptions,
  type SortOptions,
} from 'supertag-cli';

// Build pagination
const pagination = buildPagination({ limit: 100, offset: 0 });
// Returns: { sql: "LIMIT ? OFFSET ?", params: [100, 0] }

// Build order by
const orderBy = buildOrderBy(
  { sort: 'created', direction: 'DESC' },
  ['created', 'name'] // allowed columns
);
// Returns: { sql: "ORDER BY created DESC", params: [] }

// Build where clause
const where = buildWhereClause([
  { column: 'status', operator: '=', value: 'active' },
  { column: 'priority', operator: '>=', value: 2 },
]);
// Returns: { sql: "WHERE status = ? AND priority >= ?", params: ['active', 2] }
```

## TypeScript Types

All core types are exported for type safety.

```typescript
import type {
  // API types
  TanaNode,
  TanaApiNode,
  TanaApiPayload,
  TanaApiResponse,
  
  // Database types
  DatabaseContext,
  QueryContext,
  
  // Configuration types
  ResolvedWorkspace,
  
  // Graph types
  RelationshipType,
  Direction,
  RelatedNode,
  
  // Service types
  BatchGetRequest,
  BatchCreateRequest,
} from 'supertag-cli';
```

## Error Handling

Use structured error handling for better error messages.

```typescript
import {
  TanaError,
  ApiError,
  ValidationError,
  ConfigError,
  formatErrorMessage,
} from 'supertag-cli';

try {
  await client.postNodes('INBOX', nodes);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status: ${error.statusCode}`);
  } else if (error instanceof ValidationError) {
    console.error(`Validation Error: ${error.message}`);
    console.error(`Errors: ${error.errors.join(', ')}`);
  } else {
    console.error(formatErrorMessage(error));
  }
}
```

## Utilities

### Logger

```typescript
import { createLogger, configureGlobalLogger } from 'supertag-cli';

// Create a logger
const logger = createLogger({ level: 'debug', mode: 'pretty' });
logger.info('Processing nodes...');
logger.debug('Details:', { count: 42 });

// Configure global logger
configureGlobalLogger({ level: 'info', mode: 'json' });
```

### Output Formatters

```typescript
import {
  formatAsTable,
  formatAsJson,
  formatAsCsv,
  type FormattableData,
} from 'supertag-cli';

const data: FormattableData[] = [
  { id: '1', name: 'Node 1', tags: ['tag1'] },
  { id: '2', name: 'Node 2', tags: ['tag2'] },
];

console.log(formatAsTable(data));  // Pretty table
console.log(formatAsJson(data));   // JSON array
console.log(formatAsCsv(data));    // CSV format
```

## Examples

See the [examples/library-usage](../examples/library-usage) directory for a complete working example demonstrating:

- Database queries
- API operations
- Workspace resolution
- Batch operations
- Error handling

## Best Practices

1. **Use `withDatabase()` for database access** - Ensures proper connection handling
2. **Use `resolveWorkspaceContext()` for paths** - Handles workspace resolution correctly
3. **Validate inputs before API calls** - Use dry-run mode for testing
4. **Handle errors appropriately** - Use typed error classes
5. **Use batch operations for multiple nodes** - More efficient than individual calls

## Advanced Usage

### Custom Database Queries

```typescript
import { withDatabase } from 'supertag-cli';

withDatabase(dbPath, (db) => {
  // Complex query with joins
  const query = `
    SELECT 
      n.id,
      n.name,
      GROUP_CONCAT(ta.tag_name) as tags,
      COUNT(c.id) as child_count
    FROM nodes n
    LEFT JOIN tag_applications ta ON n.id = ta.data_node_id
    LEFT JOIN nodes c ON c.parent_id = n.id
    WHERE n.name LIKE ?
    GROUP BY n.id
    ORDER BY n.created DESC
    LIMIT ?
  `;
  
  return db.query(query).all('%meeting%', 10);
});
```

### Custom Node Builder

```typescript
import { buildNodePayload, type TanaApiNode } from 'supertag-cli';

// Build complex nested structure
const payload: TanaApiNode = {
  name: 'Project Plan',
  supertags: [{ id: 'project' }],
  children: [
    {
      type: 'field',
      attributeId: 'Status',
      children: [{ name: 'In Progress' }],
    },
    {
      name: 'Phase 1',
      children: [
        { name: 'Task 1.1' },
        { name: 'Task 1.2' },
      ],
    },
  ],
};
```

## Version Information

```typescript
import { VERSION } from 'supertag-cli';

console.log(`Using supertag-cli v${VERSION}`);
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.
