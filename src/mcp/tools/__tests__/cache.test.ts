/**
 * Cache Clear MCP Tool Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { cacheClear } from '../cache';
import { clearWorkspaceCache, resolveWorkspaceContext } from '../../../config/workspace-resolver';

describe('tana_cache_clear MCP tool', () => {
  beforeEach(() => {
    // Clear any existing cache state
    clearWorkspaceCache();
  });

  it('should return success when clearing empty cache', async () => {
    const result = await cacheClear({});

    expect(result.success).toBe(true);
    expect(result.message).toBe('Workspace cache cleared');
  });

  it('should clear cached workspace data', async () => {
    // First, populate the cache by resolving a workspace
    const ws1 = resolveWorkspaceContext({ requireDatabase: false });

    // Resolve again - should be cached
    const ws2 = resolveWorkspaceContext({ requireDatabase: false });
    expect(ws2.alias).toBe(ws1.alias);

    // Clear the cache
    const result = await cacheClear({});
    expect(result.success).toBe(true);

    // After clear, resolving again works (creates fresh cache entry)
    const ws3 = resolveWorkspaceContext({ requireDatabase: false });
    expect(ws3.alias).toBe(ws1.alias);
  });

  it('should be idempotent - clearing multiple times is safe', async () => {
    const result1 = await cacheClear({});
    expect(result1.success).toBe(true);

    const result2 = await cacheClear({});
    expect(result2.success).toBe(true);

    const result3 = await cacheClear({});
    expect(result3.success).toBe(true);
  });
});
