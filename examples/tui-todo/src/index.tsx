#!/usr/bin/env bun
/**
 * TUI Todo - Terminal-based todo manager demonstrating supertag-cli codegen
 *
 * Usage:
 *   bun run src/index.tsx [options]
 *
 * Options:
 *   --db <path>       Path to supertag-cli database
 *   --workspace <ws>  Workspace name (default: main)
 *   --token <token>   Tana API token for creating todos
 *   --target <id>     Target node ID for new todos (default: INBOX)
 *   --help            Show help
 */

import React from "react";
import { render } from "ink";
import { App } from "./components/App";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Parse command line arguments
function parseArgs(): {
  dbPath: string;
  apiToken?: string;
  targetNodeId: string;
  showHelp: boolean;
} {
  const args = process.argv.slice(2);
  let workspace = "main";
  let dbPath: string | null = null;
  let apiToken: string | undefined;
  let targetNodeId = "INBOX";
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      showHelp = true;
      continue;
    }

    if (arg === "--db" && args[i + 1]) {
      dbPath = args[++i];
      continue;
    }

    if (arg === "--workspace" && args[i + 1]) {
      workspace = args[++i];
      continue;
    }

    if (arg === "--token" && args[i + 1]) {
      apiToken = args[++i];
      continue;
    }

    if (arg === "--target" && args[i + 1]) {
      targetNodeId = args[++i];
      continue;
    }
  }

  // Default database path
  if (!dbPath) {
    dbPath = join(
      homedir(),
      ".local",
      "share",
      "supertag",
      "workspaces",
      workspace,
      "tana-index.db"
    );
  }

  // Try to get token from environment
  if (!apiToken) {
    apiToken = process.env.TANA_API_TOKEN;
  }

  return { dbPath, apiToken, targetNodeId, showHelp };
}

function showHelpMessage(): void {
  console.log(`
TUI Todo - Terminal-based todo manager demonstrating supertag-cli codegen

USAGE:
  bun run src/index.tsx [options]

OPTIONS:
  --db <path>       Path to supertag-cli database
  --workspace <ws>  Workspace name (default: main)
  --token <token>   Tana API token for creating todos
                    (or set TANA_API_TOKEN environment variable)
  --target <id>     Target node ID for new todos (default: INBOX)
  --help, -h        Show this help message

KEYBOARD SHORTCUTS:
  j/k, Up/Down      Navigate todos
  n                 Create new todo
  /                 Search/filter
  ?                 Show help
  r                 Refresh
  q                 Quit

EXAMPLES:
  # Use default database (main workspace)
  bun run src/index.tsx

  # Use specific workspace
  bun run src/index.tsx --workspace work

  # With API token for creating todos
  bun run src/index.tsx --token YOUR_TANA_API_TOKEN

NOTES:
  - This app reads from the supertag-cli SQLite database
  - Run 'supertag sync index' first to populate the database
  - New todos are created via Tana Input API (requires token)
  - Created todos won't appear until next 'supertag sync index'
`);
}

function main(): void {
  const { dbPath, apiToken, targetNodeId, showHelp } = parseArgs();

  if (showHelp) {
    showHelpMessage();
    process.exit(0);
  }

  // Check database exists
  if (!existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    console.error("");
    console.error("Please run 'supertag sync index' first to create the database.");
    console.error("Or specify a different path with --db <path>");
    process.exit(1);
  }

  // Render the app
  render(
    <App
      dbPath={dbPath}
      apiToken={apiToken}
      targetNodeId={targetNodeId}
    />
  );
}

main();
