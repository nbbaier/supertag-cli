/**
 * MCP Cache Clear Tool
 *
 * Clears the workspace resolver cache. Call this at request boundaries
 * to ensure fresh data when workspace configuration might have changed.
 */

import type { CacheClearInput } from '../schemas.js';
import { clearWorkspaceCache } from '../../config/workspace-resolver.js';

export interface CacheClearResult {
  success: boolean;
  message: string;
}

/**
 * Clear the workspace resolver cache
 */
export async function cacheClear(_input: CacheClearInput): Promise<CacheClearResult> {
  clearWorkspaceCache();
  return {
    success: true,
    message: 'Workspace cache cleared',
  };
}
