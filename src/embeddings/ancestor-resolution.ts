/**
 * Ancestor Resolution for Semantic Search
 *
 * When semantic search matches a deeply nested node (like a text fragment),
 * this module finds the nearest meaningful ancestor - a node with a supertag
 * that provides semantic context (e.g., #project, #meeting, #book).
 */

import { Database } from "bun:sqlite";
import { withDbRetrySync } from "../db/retry";

export interface AncestorNode {
  id: string;
  name: string;
  tags: string[];
}

export interface AncestorResult {
  /** The ancestor node with supertag(s) */
  ancestor: AncestorNode;
  /** Path from ancestor to matched node (node names) */
  path: string[];
  /** Number of levels traversed (0 if matched node itself has tag) */
  depth: number;
}

/**
 * Find the nearest ancestor with a supertag for a given node.
 *
 * Walks up the parent_id chain until finding a node with at least one
 * supertag applied. Returns null if no such ancestor exists within
 * the max depth limit.
 *
 * @param db - SQLite database connection
 * @param nodeId - ID of the node to find ancestor for
 * @param maxDepth - Maximum levels to traverse (default: 50)
 * @returns AncestorResult or null if no tagged ancestor found
 */
export function findMeaningfulAncestor(
  db: Database,
  nodeId: string,
  maxDepth: number = 50
): AncestorResult | null {
  // Track visited nodes to detect circular references
  const visited = new Set<string>();

  // Build path from matched node up to ancestor
  const pathFromBottom: string[] = [];

  let currentId: string | null = nodeId;
  let depth = 0;

  while (currentId && depth <= maxDepth) {
    // Circular reference check
    if (visited.has(currentId)) {
      return null;
    }
    visited.add(currentId);

    // Get current node
    const node = withDbRetrySync(
      () => db
        .query("SELECT id, name, parent_id FROM nodes WHERE id = ?")
        .get(currentId) as { id: string; name: string; parent_id: string | null } | null,
      "findMeaningfulAncestor node"
    );

    if (!node) {
      return null;
    }

    // Check if this node has any supertags
    const tags = withDbRetrySync(
      () => db
        .query(
          `SELECT DISTINCT tag_name as name
           FROM tag_applications
           WHERE data_node_id = ?`
        )
        .all(currentId) as { name: string }[],
      "findMeaningfulAncestor tags"
    );

    if (tags.length > 0) {
      // Found a node with supertag!
      // Path should be from ancestor DOWN to matched node
      // We built path from bottom up, so reverse and include current node's name
      const path = [...pathFromBottom].reverse();
      // Add the matched node's name at the end if we're not at the starting node
      if (depth === 0) {
        path.push(node.name);
      }

      return {
        ancestor: {
          id: node.id,
          name: node.name,
          tags: tags.map((t) => t.name),
        },
        path,
        depth,
      };
    }

    // No tag on this node, add to path and continue up
    pathFromBottom.push(node.name);

    // Move to parent
    currentId = node.parent_id;
    depth++;
  }

  // No ancestor with supertag found within max depth
  return null;
}
