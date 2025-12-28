# TUI Todo - supertag-cli Codegen Demo

A terminal-based todo manager that demonstrates the supertag-cli codegen feature. Uses generated Effect schemas, displays todos in a split-pane layout, and creates new todos via Tana Input API.

![TUI Todo Screenshot](./screenshot.png)

## Features

- **Split-pane layout**: Todo list on the left, details on the right
- **Vim-style navigation**: j/k, g/G for efficient keyboard navigation
- **Search/filter**: Real-time filtering by title, priority, or status
- **Create todos**: Create new todos via Tana Input API
- **Visual feedback**: Priority indicators, completed strikethrough, status messages

## Prerequisites

1. **supertag-cli installed and configured**
   ```bash
   supertag sync index   # Populate the database from Tana exports
   ```

2. **Bun runtime** (for running the app)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Tana API token** (optional, for creating todos)
   - Get your token from Tana settings
   - Export as `TANA_API_TOKEN` or pass with `--token`

## Installation

```bash
cd examples/tui-todo
bun install
```

## Usage

### Basic usage (read-only mode)

```bash
bun run start
```

### With API token (enables todo creation)

```bash
bun run start --token YOUR_TANA_API_TOKEN

# Or use environment variable
export TANA_API_TOKEN=your_token
bun run start
```

### Using a specific workspace

```bash
bun run start --workspace work
```

### Using a custom database path

```bash
bun run start --db /path/to/tana-index.db
```

## Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `g` | Go to first |
| `G` | Go to last |

### Actions
| Key | Action |
|-----|--------|
| `n` | Create new todo |
| `/` | Search/filter |
| `Esc` | Clear filter / Cancel |
| `r` | Refresh todos |

### General
| Key | Action |
|-----|--------|
| `?` | Toggle help |
| `q` | Quit |
| `Ctrl+c` | Force quit |

## How It Works

### Schema Generation

This example uses the supertag-cli codegen feature to generate type-safe schemas:

```bash
# Generate schemas from your Tana workspace
supertag codegen generate -o ./src/schemas.ts --tags Todo
```

This generates Effect Schema classes:

```typescript
import { Schema } from "effect";

export class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.String,
  title: Schema.optionalWith(Schema.String, { as: "Option" }),
  dueDate: Schema.optionalWith(Schema.DateFromString, { as: "Option" }),
  completed: Schema.optionalWith(Schema.Boolean, { as: "Option" }),
  status: Schema.optionalWith(Schema.String, { as: "Option" }),
  priority: Schema.optionalWith(Schema.String, { as: "Option" }),
}) {}
```

### Data Flow

1. **Read**: TodoService queries the SQLite database populated by `supertag sync index`
2. **Display**: React/Ink components render todos in the terminal
3. **Create**: TanaInputApi sends new todos to Tana via Input API
4. **Sync**: Run `supertag sync index` to see new todos (created via API)

### Architecture

```
src/
├── index.tsx              # Entry point
├── schemas.ts             # Generated Effect schemas
├── components/
│   ├── App.tsx            # Main app with state management
│   ├── TodoList.tsx       # Left pane: todo list
│   ├── TodoDetail.tsx     # Right pane: selected todo details
│   ├── StatusBar.tsx      # Bottom: status and shortcuts
│   ├── CreateForm.tsx     # New todo form
│   ├── HelpOverlay.tsx    # Keyboard shortcuts help
│   └── SearchInput.tsx    # Filter input
├── services/
│   ├── todo-service.ts    # SQLite database queries
│   └── tana-input-api.ts  # Tana Input API client
└── types/
    └── app-state.ts       # State types and reducer
```

## Development

### Run in watch mode

```bash
bun run dev
```

### Run tests

```bash
bun test
```

### Build standalone binary

```bash
bun run build
./tui-todo
```

## Notes

- **Read-only by default**: Without an API token, the app is read-only
- **Sync required**: New todos created via the app won't appear until you run `supertag sync index`
- **Todo supertag**: The app looks for nodes tagged with `#Todo` supertag
- **Field mapping**: Uses `Priority`, `Due Date`, `Completed`, and `Status` fields

## Troubleshooting

### "Database not found"

Run `supertag sync index` first to create and populate the database.

### "No todos found"

Ensure you have nodes tagged with `#Todo` supertag in your Tana workspace, then run `supertag sync index`.

### Created todos don't appear

The app reads from a local SQLite database. After creating a todo via the API:
1. The todo is created in Tana
2. Run `supertag sync index` to sync from Tana export
3. The todo will appear on next app refresh

## License

MIT - Part of the supertag-cli project.
