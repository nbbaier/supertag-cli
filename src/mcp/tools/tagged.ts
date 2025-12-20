/**
 * tana_tagged Tool
 *
 * Find nodes with a specific supertag applied.
 */

import { TanaQueryEngine } from '../../query/tana-query-engine.js';
import { resolveWorkspace } from '../../config/paths.js';
import { ConfigManager } from '../../config/manager.js';
import type { TaggedInput } from '../schemas.js';
import { parseDateRange } from '../schemas.js';

export interface TaggedNodeItem {
  id: string;
  name: string | null;
  created: number | null;
  updated: number | null;
}

export interface TaggedResult {
  workspace: string;
  tagname: string;
  nodes: TaggedNodeItem[];
  count: number;
}

export async function tagged(input: TaggedInput): Promise<TaggedResult> {
  const config = ConfigManager.getInstance().getConfig();
  const workspace = resolveWorkspace(input.workspace, config);

  const engine = new TanaQueryEngine(workspace.dbPath);

  try {
    // Handle case-insensitive matching
    let tagName = input.tagname;
    if (input.caseInsensitive) {
      // Get all tags and find case-insensitive match
      const allTags = await engine.getTagApplicationCounts();
      const match = allTags.find(
        (t) => t.tagName.toLowerCase() === input.tagname.toLowerCase()
      );
      if (match) {
        tagName = match.tagName;
      }
    }

    const dateRange = parseDateRange(input);
    const nodes = await engine.findNodesByTag(tagName, {
      limit: input.limit || 20,
      orderBy: input.orderBy || 'created',
      ...dateRange,
    });

    const items: TaggedNodeItem[] = nodes.map((n) => ({
      id: n.id,
      name: n.name,
      created: n.created,
      updated: n.updated,
    }));

    return {
      workspace: workspace.alias,
      tagname: tagName,
      nodes: items,
      count: items.length,
    };
  } finally {
    engine.close();
  }
}
