#!/usr/bin/env bun

/**
 * Tana Sync CLI - Monitor and index Tana exports
 *
 * Usage:
 *   tana-sync monitor --watch         # Start monitoring export directory
 *   tana-sync index                   # Manually index latest export
 *   tana-sync status                  # Show watcher status
 */

import { Command } from "commander";
import { TanaExportWatcher } from "../monitors/tana-export-monitor";
import { existsSync } from "fs";
import {
  getDatabasePath,
  DEFAULT_EXPORT_DIR,
  createSimpleLogger,
} from "../config/paths";
import { VERSION } from "../version";

const program = new Command();

// Logger - use simple logger (no external dependencies)
const logger = createSimpleLogger('tana-sync');

// Default paths - use centralized XDG-compliant paths
const DEFAULT_DB_PATH = getDatabasePath();

program
  .name("tana-sync")
  .description("Monitor and index Tana exports")
  .version(VERSION);

program
  .command("monitor")
  .description("Monitor export directory for changes")
  .option("--watch", "Continuously watch for new exports", false)
  .option("--export-dir <path>", "Export directory path", DEFAULT_EXPORT_DIR)
  .option("--db-path <path>", "Database path", DEFAULT_DB_PATH)
  .option("--debounce <ms>", "Debounce delay in milliseconds", "1000")
  .action(async (options) => {
    logger.info(`Export directory: ${options.exportDir}`);
    logger.info(`Database: ${options.dbPath}`);

    // Verify export directory exists
    if (!existsSync(options.exportDir)) {
      logger.error(`Export directory does not exist: ${options.exportDir}`);
      logger.error(`Create it or specify --export-dir`);
      process.exit(1);
    }

    const watcher = new TanaExportWatcher({
      exportDir: options.exportDir,
      dbPath: options.dbPath,
      debounceMs: parseInt(options.debounce),
    });

    // Set up event listeners
    watcher.on("indexed", (result) => {
      logger.info(`Indexed: ${result.exportFile}`);
      if (result.nodesAdded !== undefined || result.nodesModified !== undefined) {
        logger.info(`Changes: +${result.nodesAdded || 0} added, ~${result.nodesModified || 0} modified, -${result.nodesDeleted || 0} deleted`);
      }
      logger.info(`Total Nodes: ${result.nodesIndexed.toLocaleString()}`);
      logger.info(`Supertags: ${result.supertagsIndexed.toLocaleString()}`);
      logger.info(`Fields: ${result.fieldsIndexed.toLocaleString()}`);
      logger.info(`References: ${result.referencesIndexed.toLocaleString()}`);
      logger.info(`Tag Applications: ${result.tagApplicationsIndexed.toLocaleString()}`);
      logger.info(`Duration: ${result.durationMs}ms`);
    });

    watcher.on("error", (error) => {
      logger.error('Watcher error', error);
    });

    if (options.watch) {
      logger.info('Watching for new exports... (press Ctrl+C to stop)');
      watcher.start();

      // Keep process alive
      process.on("SIGINT", () => {
        logger.info('Stopping watcher...');
        watcher.stop();
        process.exit(0);
      });

      // Prevent exit
      await new Promise(() => {});
    } else {
      // One-time index
      logger.info('Indexing latest export...');
      try {
        const result = await watcher.indexLatest();
        process.exit(0);
      } catch (error) {
        logger.error('Index failed', error as Error);
        process.exit(1);
      }
    }
  });

program
  .command("index")
  .description("Manually index latest export")
  .option("--export-dir <path>", "Export directory path", DEFAULT_EXPORT_DIR)
  .option("--db-path <path>", "Database path", DEFAULT_DB_PATH)
  .action(async (options) => {
    logger.info(`Export directory: ${options.exportDir}`);
    logger.info(`Database: ${options.dbPath}`);

    if (!existsSync(options.exportDir)) {
      logger.error(`Export directory does not exist: ${options.exportDir}`);
      process.exit(1);
    }

    const watcher = new TanaExportWatcher({
      exportDir: options.exportDir,
      dbPath: options.dbPath,
    });

    logger.info('Indexing latest export...');
    try {
      const result = await watcher.indexLatest();
      logger.info(`Indexed: ${result.exportFile}`);
      if (result.nodesAdded !== undefined || result.nodesModified !== undefined) {
        logger.info(`Changes: +${result.nodesAdded || 0} added, ~${result.nodesModified || 0} modified, -${result.nodesDeleted || 0} deleted`);
      }
      logger.info(`Total Nodes: ${result.nodesIndexed.toLocaleString()}`);
      logger.info(`Supertags: ${result.supertagsIndexed.toLocaleString()}`);
      logger.info(`Fields: ${result.fieldsIndexed.toLocaleString()}`);
      logger.info(`References: ${result.referencesIndexed.toLocaleString()}`);
      logger.info(`Tag Applications: ${result.tagApplicationsIndexed.toLocaleString()}`);
      logger.info(`Duration: ${result.durationMs}ms (${(result.durationMs / 1000).toFixed(2)}s)`);
      watcher.close();
      process.exit(0);
    } catch (error) {
      logger.error('Index failed', error as Error);
      watcher.close();
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show watcher status")
  .option("--export-dir <path>", "Export directory path", DEFAULT_EXPORT_DIR)
  .option("--db-path <path>", "Database path", DEFAULT_DB_PATH)
  .action((options) => {
    logger.info(`Export directory: ${options.exportDir}`);
    logger.info(`Database: ${options.dbPath}`);

    if (!existsSync(options.exportDir)) {
      logger.error(`Export directory does not exist: ${options.exportDir}`);
      process.exit(1);
    }

    const watcher = new TanaExportWatcher({
      exportDir: options.exportDir,
      dbPath: options.dbPath,
    });

    const status = watcher.getStatus();

    logger.info('Status:');
    logger.info(`Watching: ${status.watching ? "Yes" : "No"}`);
    logger.info(`Export dir: ${status.exportDir}`);
    logger.info(`Database: ${status.dbPath}`);
    logger.info(`Latest export: ${status.latestExport || "None found"}`);
    logger.info(`Last indexed: ${status.lastIndexed ? new Date(status.lastIndexed).toLocaleString() : "Never"}`);

    watcher.close();
  });

program.parse();
