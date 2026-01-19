#!/usr/bin/env bun

/**
 * Supertag CLI Lite - Without Embeddings
 *
 * Lightweight build for Raycast extension that excludes embedding-related
 * commands to avoid native module dependencies (@lancedb/lancedb).
 *
 * Includes: create, post, config, schema, sync, tags, nodes, fields, search, batch, stats
 * Excludes: embed, server (webhook), visualization with embeddings
 */

import { Command } from 'commander';
import { formatCommand } from './commands/format';
import { postCommand } from './commands/post';
import { configCommand } from './commands/config';
import { createSchemaCommand } from './commands/schema';
import { createCommand } from './commands/create';
import { registerSyncCommands } from './commands/sync';
import { createWorkspaceCommand } from './commands/workspace';
// Harmonized commands (CLI Harmonization Phase 1)
import { createSearchCommand } from './commands/search';
import { createNodesCommand } from './commands/nodes';
import { createTagsCommand } from './commands/tags';
import { createStatsCommand } from './commands/stats';
import { createFieldsCommand } from './commands/fields';
import { createTranscriptCommand } from './commands/transcript';
import { createBatchCommand } from './commands/batch';
import { createQueryCommand } from './commands/query';
import { createAggregateCommand } from './commands/aggregate';
import { createRelatedCommand } from './commands/related';
import { createAttachmentsCommand } from './commands/attachments';
import { createSimpleLogger, ensureAllDirs } from './config/paths';
import { VERSION } from './version';
import { createCodegenCommand } from './commands/codegen';
import { createUpdateCommand, checkForUpdatePassive } from './commands/update';
import { createErrorsCommand } from './commands/errors';
import { setDebugMode } from './utils/debug';

// Use portable logger (no external dependencies)
export const logger = createSimpleLogger('tana-skill');

// Ensure all directories exist on startup
ensureAllDirs();

const program = new Command();

program
  .name('supertag')
  .description('Supertag CLI Lite - read, write, sync Tana data (no embeddings)')
  .version(VERSION)
  .option('--debug', 'Enable debug mode with verbose error output');

/**
 * Format Command
 * Converts JSON to Tana Paste format
 */
program
  .command('format')
  .description('Convert JSON input to Tana Paste format')
  .option('-p, --pretty', 'Pretty print JSON input before conversion')
  .action(async (options) => {
    await formatCommand(options);
  });

/**
 * Post Command
 * Post data to Tana via Input API
 */
program
  .command('post')
  .description('Post data to Tana via Input API')
  .option('-t, --target <node>', 'Target node ID (INBOX, SCHEMA, or specific node ID)')
  .option('--token <token>', 'API token (overrides config)')
  .option('-d, --dry-run', 'Validate but don\'t post (dry run mode)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    await postCommand(options);
  });

/**
 * Config Command
 * Manage configuration
 */
program
  .command('config')
  .description('Manage Tana CLI configuration')
  .option('-s, --show', 'Show current configuration')
  .option('--token <token>', 'Set API token')
  .option('--target <node>', 'Set default target node (INBOX, SCHEMA, or node ID)')
  .option('--endpoint <url>', 'Set API endpoint URL')
  .action(async (options) => {
    await configCommand(options);
  });

/**
 * Schema Command (Commander subcommands)
 * Manage supertag schema registry
 */
program.addCommand(createSchemaCommand());

/**
 * Create Command
 * Create any supertag node dynamically using schema registry
 */
program
  .command('create <supertag> [name]')
  .description('Create any supertag node dynamically. For inline refs use: <span data-inlineref-node="ID">Text</span>')
  .option('-t, --target <node>', 'Target node ID (INBOX, SCHEMA, or specific node ID)')
  .option('--token <token>', 'API token (overrides config)')
  .option('-d, --dry-run', 'Validate but don\'t post (dry run mode)')
  .option('-v, --verbose', 'Verbose output with field mapping details')
  .option('-f, --file <path>', 'Read JSON input from file')
  .option('--json <json>', 'Pass JSON input directly as argument')
  .option('-c, --children <child...>', 'Child nodes: plain text, JSON {"name":"...", "id":"..."} for ref nodes, or text with <span data-inlineref-node="ID">Text</span>')
  .allowUnknownOption(true) // Allow dynamic field options
  .action(async (supertag, name, options, command) => {
    // Parse unknown options as field values
    const allOptions = { ...options };
    const args = command.args || [];

    // Parse remaining args as --field value pairs
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        const fieldName = arg.slice(2).replace(/-/g, '');
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
          allOptions[fieldName] = value;
          i++;
        }
      }
    }

    await createCommand(supertag, name, allOptions);
  });

/**
 * Register command groups
 */
registerSyncCommands(program);
program.addCommand(createWorkspaceCommand());
program.addCommand(createSearchCommand());
program.addCommand(createNodesCommand());
program.addCommand(createTagsCommand());
program.addCommand(createFieldsCommand());
program.addCommand(createStatsCommand());
program.addCommand(createTranscriptCommand());
program.addCommand(createBatchCommand());
program.addCommand(createQueryCommand());
program.addCommand(createAggregateCommand());
program.addCommand(createRelatedCommand());
program.addCommand(createAttachmentsCommand());
program.addCommand(createCodegenCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createErrorsCommand());

// Global error handler
program.exitOverride();

// Parse command line arguments
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.optsWithGlobals();
  if (opts.debug) {
    setDebugMode(true);
  }
});

// Check for updates in background (non-blocking)
void checkForUpdatePassive();

program.parse();
