/**
 * Entity Detection for Tana Nodes
 *
 * Entities are "interesting" nodes in Tana - things worth finding.
 * Based on Tana developer insights from Odin Urdland:
 *
 * Entity detection (in Tana runtime):
 * 1. props._entityOverride - Explicit user signal (takes precedence)
 * 2. props._flags % 2 === 1 - Automatic entity flag (LSB set)
 *
 * NOTE: The Tana JSON export uses `_flags` (with underscore prefix).
 * Export data contains ~13,735 entities with _flags=1 out of 1.3M nodes.
 * We also use fallback inference for nodes without _flags:
 * - Tagged items (has any supertag applied) → entity
 * - Items in Library (_ownerId ends with _STASH) → entity
 *
 * What makes a node an entity:
 * - Tagged items (has any supertag applied)
 * - Items in Library (stash)
 * - Items created via "Create new" or "+"
 *
 * Why this matters for search:
 * - Entities are the meaningful nodes users want to find
 * - Non-entities are typically fragments, children, or structural elements
 * - Embedding entities gives better search results
 * - Returning entities (or their containing entity) improves UX
 */

import type { Database } from "bun:sqlite";
import { withDbRetrySync } from "./retry";

/**
 * Check if a node is an entity based on raw node data
 *
 * NOTE: Export uses `_flags` (with underscore prefix), not `flags`.
 *
 * @param props - The node's props object (from raw_data.props)
 * @returns true if node is an entity
 */
export function isEntity(props: {
  _entityOverride?: boolean;
  _flags?: number;
  flags?: number; // Legacy support
  _ownerId?: string;
}): boolean {
  // User override takes precedence (if available in export)
  if (props._entityOverride !== undefined) {
    return props._entityOverride;
  }

  // Check automatic entity flag (LSB of _flags) - primary check for exports
  if (props._flags !== undefined) {
    return props._flags % 2 === 1;
  }

  // Legacy: Check flags without underscore (in case format changes)
  if (props.flags !== undefined) {
    return props.flags % 2 === 1;
  }

  // Infer from ownerId: library items (_STASH) are entities
  if (props._ownerId && props._ownerId.endsWith("_STASH")) {
    return true;
  }

  // Cannot determine from props alone - need DB check for tags
  return false;
}

/**
 * Check if a node is an entity by ID (database lookup)
 *
 * Uses multiple signals to detect entity status:
 * 1. props._entityOverride (if available in export)
 * 2. props._flags LSB (primary - uses underscore prefix)
 * 3. Library membership (_ownerId ends with _STASH)
 * 4. Has any supertag applied
 *
 * @param db - Database connection
 * @param nodeId - Node ID to check
 * @returns true if node is an entity
 */
export function isEntityById(db: Database, nodeId: string): boolean {
  const result = withDbRetrySync(
    () =>
      db
        .query(
          `
      SELECT
        json_extract(raw_data, '$.props._entityOverride') as entity_override,
        json_extract(raw_data, '$.props._flags') as flags,
        json_extract(raw_data, '$.props._ownerId') as owner_id,
        (SELECT COUNT(*) FROM tag_applications WHERE data_node_id = n.id) as tag_count
      FROM nodes n
      WHERE id = ?
    `
        )
        .get(nodeId) as {
        entity_override: number | null; // SQLite returns 1/0 for JSON booleans
        flags: number | null;
        owner_id: string | null;
        tag_count: number;
      } | null,
    "isEntityById"
  );

  if (!result) return false;

  // User override takes precedence (if available in export)
  // SQLite returns 1/0 for JSON booleans, so coerce to boolean
  if (result.entity_override !== null) {
    return result.entity_override === 1;
  }

  // Check automatic entity flag (LSB of _flags) - primary check
  if (result.flags !== null) {
    return result.flags % 2 === 1;
  }

  // Infer from available data:
  // 1. Library items (_STASH) are entities
  if (result.owner_id && result.owner_id.endsWith("_STASH")) {
    return true;
  }

  // 2. Tagged items are entities
  if (result.tag_count > 0) {
    return true;
  }

  return false;
}

/**
 * Find the nearest entity ancestor for a node
 * Walks up the node tree until it finds an entity
 *
 * Uses _flags (with underscore prefix) from export, plus fallback inference.
 *
 * @param db - Database connection
 * @param nodeId - Starting node ID
 * @param maxDepth - Maximum levels to traverse (default: 50)
 * @returns Entity ancestor info or null if none found
 */
export function findNearestEntityAncestor(
  db: Database,
  nodeId: string,
  maxDepth: number = 50
): { id: string; name: string; depth: number } | null {
  const result = withDbRetrySync(
    () =>
      db
        .query(
          `
      WITH RECURSIVE ancestor_chain AS (
        -- Start with the node itself
        SELECT
          id,
          name,
          parent_id,
          json_extract(raw_data, '$.props._entityOverride') as entity_override,
          json_extract(raw_data, '$.props._flags') as flags,
          json_extract(raw_data, '$.props._ownerId') as owner_id,
          0 as depth
        FROM nodes
        WHERE id = ?

        UNION ALL

        -- Walk up to parent
        SELECT
          n.id,
          n.name,
          n.parent_id,
          json_extract(n.raw_data, '$.props._entityOverride') as entity_override,
          json_extract(n.raw_data, '$.props._flags') as flags,
          json_extract(n.raw_data, '$.props._ownerId') as owner_id,
          ac.depth + 1
        FROM nodes n
        INNER JOIN ancestor_chain ac ON n.id = ac.parent_id
        WHERE ac.parent_id IS NOT NULL AND ac.depth < ?
      )
      SELECT ac.id, ac.name, ac.depth
      FROM ancestor_chain ac
      WHERE
        -- Entity override is true (if available in export)
        ac.entity_override = 1
        OR (
          -- No override and _flags LSB is set (primary check)
          ac.entity_override IS NULL
          AND ac.flags IS NOT NULL
          AND (ac.flags % 2) = 1
        )
        OR (
          -- Inferred: Library items (_STASH) are entities
          ac.owner_id LIKE '%_STASH'
        )
        OR (
          -- Inferred: Tagged items are entities
          EXISTS (SELECT 1 FROM tag_applications WHERE data_node_id = ac.id)
        )
      ORDER BY ac.depth ASC
      LIMIT 1
    `
        )
        .get(nodeId, maxDepth) as {
        id: string;
        name: string;
        depth: number;
      } | null,
    "findNearestEntityAncestor"
  );

  return result;
}

/**
 * Get entity statistics for a database
 *
 * Uses _flags (with underscore prefix) from export, plus fallback inference.
 *
 * @param db - Database connection
 * @returns Entity stats
 */
export function getEntityStats(db: Database): {
  totalNodes: number;
  totalEntities: number;
  entitiesTagged: number;
  entitiesLibrary: number;
  entitiesWithOverride: number;
  entitiesAutomatic: number;
  entityPercentage: string;
} {
  const stats = withDbRetrySync(
    () =>
      db
        .query(
          `
      SELECT
        (SELECT COUNT(*) FROM nodes WHERE name IS NOT NULL) as total_nodes,
        -- Entities with explicit override (if available)
        (SELECT COUNT(*) FROM nodes
         WHERE name IS NOT NULL
         AND json_extract(raw_data, '$.props._entityOverride') = 1) as entities_override,
        -- Entities with automatic _flags (primary check)
        (SELECT COUNT(*) FROM nodes
         WHERE name IS NOT NULL
         AND json_extract(raw_data, '$.props._entityOverride') IS NULL
         AND json_extract(raw_data, '$.props._flags') IS NOT NULL
         AND (json_extract(raw_data, '$.props._flags') % 2) = 1) as entities_auto,
        -- Inferred: Tagged items (distinct nodes with tags)
        (SELECT COUNT(DISTINCT data_node_id) FROM tag_applications
         WHERE data_node_id IN (SELECT id FROM nodes WHERE name IS NOT NULL)) as entities_tagged,
        -- Inferred: Library items (_STASH)
        (SELECT COUNT(*) FROM nodes
         WHERE name IS NOT NULL
         AND json_extract(raw_data, '$.props._ownerId') LIKE '%_STASH') as entities_library
    `
        )
        .get() as {
        total_nodes: number;
        entities_override: number;
        entities_auto: number;
        entities_tagged: number;
        entities_library: number;
      },
    "getEntityStats"
  );

  // Total entities: combine all sources (with some overlap between tagged and library)
  // Prefer _flags-based count when available, fallback to tagged + library
  const totalEntities = stats.entities_override + stats.entities_auto +
    (stats.entities_override === 0 && stats.entities_auto === 0
      ? stats.entities_tagged + stats.entities_library
      : 0);

  const entityPercentage =
    stats.total_nodes > 0
      ? ((totalEntities / stats.total_nodes) * 100).toFixed(1)
      : "0";

  return {
    totalNodes: stats.total_nodes,
    totalEntities: totalEntities,
    entitiesTagged: stats.entities_tagged,
    entitiesLibrary: stats.entities_library,
    entitiesWithOverride: stats.entities_override,
    entitiesAutomatic: stats.entities_auto,
    entityPercentage: `${entityPercentage}%`,
  };
}

/**
 * SQL fragment for entity filtering
 * Use in WHERE clauses to filter to entities only
 *
 * Uses _flags (with underscore prefix) from export, plus fallback inference.
 *
 * Use with table alias 'n' (e.g., FROM nodes n WHERE ${ENTITY_FILTER_SQL})
 */
export const ENTITY_FILTER_SQL = `(
  -- Explicit entity override (if available in export)
  json_extract(n.raw_data, '$.props._entityOverride') = 1
  OR (
    -- Automatic entity _flags (primary check)
    json_extract(n.raw_data, '$.props._entityOverride') IS NULL
    AND json_extract(n.raw_data, '$.props._flags') IS NOT NULL
    AND (json_extract(n.raw_data, '$.props._flags') % 2) = 1
  )
  OR (
    -- Inferred: Library items (_STASH) are entities
    json_extract(n.raw_data, '$.props._ownerId') LIKE '%_STASH'
  )
  OR (
    -- Inferred: Tagged items are entities
    EXISTS (SELECT 1 FROM tag_applications WHERE data_node_id = n.id)
  )
)`;
