/**
 * tana_sync Tool
 *
 * Trigger reindex of Tana exports or check sync status.
 * Wraps the sync commands from the CLI.
 */

import { existsSync } from 'fs';
import { TanaExportWatcher } from '../../monitors/tana-export-monitor.js';
import { ConfigManager } from '../../config/manager.js';
import {
  resolveWorkspace,
  ensureWorkspaceDir,
} from '../../config/paths.js';
import type { SyncInput } from '../schemas.js';

export interface SyncResult {
  workspace: string;
  action: 'index' | 'status';
  exportDir: string;
  dbPath: string;
  latestExport?: string | null;
  lastIndexed?: number | null;
  nodesIndexed?: number;
  supertagsIndexed?: number;
  fieldsIndexed?: number;
  referencesIndexed?: number;
  durationMs?: number;
  error?: string;
}

export async function sync(input: SyncInput): Promise<SyncResult> {
  const configManager = ConfigManager.getInstance();
  const config = configManager.getConfig();
  const workspace = resolveWorkspace(input.workspace, config);

  const baseResult: SyncResult = {
    workspace: workspace.alias,
    action: input.action,
    exportDir: workspace.exportDir,
    dbPath: workspace.dbPath,
  };

  // Check if export directory exists
  if (!existsSync(workspace.exportDir)) {
    return {
      ...baseResult,
      error: `Export directory does not exist: ${workspace.exportDir}`,
    };
  }

  // Ensure workspace directory exists for database storage
  ensureWorkspaceDir(workspace.alias);

  const watcher = new TanaExportWatcher({
    exportDir: workspace.exportDir,
    dbPath: workspace.dbPath,
  });

  try {
    if (input.action === 'status') {
      const status = watcher.getStatus();
      return {
        ...baseResult,
        latestExport: status.latestExport || null,
        lastIndexed: status.lastIndexed || null,
      };
    }

    // action === 'index'
    const result = await watcher.indexLatest();
    return {
      ...baseResult,
      latestExport: result.exportFile,
      nodesIndexed: result.nodesIndexed,
      supertagsIndexed: result.supertagsIndexed,
      fieldsIndexed: result.fieldsIndexed,
      referencesIndexed: result.referencesIndexed,
      durationMs: result.durationMs,
    };
  } catch (error) {
    return {
      ...baseResult,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    watcher.close();
  }
}
