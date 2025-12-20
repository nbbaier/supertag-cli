/**
 * tana_supertags Tool
 *
 * List all available supertags with usage counts.
 */

import { TanaQueryEngine } from '../../query/tana-query-engine.js';
import { resolveWorkspace } from '../../config/paths.js';
import { ConfigManager } from '../../config/manager.js';
import type { SupertagsInput } from '../schemas.js';

export interface SupertagInfo {
  tagName: string;
  tagId: string;
  count: number;
}

export interface SupertagsResult {
  workspace: string;
  supertags: SupertagInfo[];
  total: number;
}

export async function supertags(input: SupertagsInput): Promise<SupertagsResult> {
  const config = ConfigManager.getInstance().getConfig();
  const workspace = resolveWorkspace(input.workspace, config);

  const engine = new TanaQueryEngine(workspace.dbPath);

  try {
    // Get tag counts sorted by usage
    const tagCounts = await engine.getTopTagsByUsage(input.limit || 20);

    return {
      workspace: workspace.alias,
      supertags: tagCounts,
      total: tagCounts.length,
    };
  } finally {
    engine.close();
  }
}
