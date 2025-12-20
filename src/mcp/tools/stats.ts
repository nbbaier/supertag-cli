/**
 * tana_stats Tool
 *
 * Get database statistics including total nodes, supertags, fields, and references.
 */

import { TanaQueryEngine } from '../../query/tana-query-engine.js';
import { resolveWorkspace } from '../../config/paths.js';
import { ConfigManager } from '../../config/manager.js';
import type { StatsInput } from '../schemas.js';

export interface StatsResult {
  workspace: string;
  totalNodes: number;
  totalSupertags: number;
  totalFields: number;
  totalReferences: number;
}

export async function stats(input: StatsInput): Promise<StatsResult> {
  const config = ConfigManager.getInstance().getConfig();
  const workspace = resolveWorkspace(input.workspace, config);

  const engine = new TanaQueryEngine(workspace.dbPath);

  try {
    const statistics = await engine.getStatistics();

    return {
      workspace: workspace.alias,
      ...statistics,
    };
  } finally {
    engine.close();
  }
}
