/**
 * tana_create Tool
 *
 * Create new nodes in Tana via the Input API.
 * Supports dry-run mode for validation without posting.
 */

import { createApiClient } from '../../api/client.js';
import { getSchemaRegistry } from '../../commands/schema.js';
import { ConfigManager } from '../../config/manager.js';
import { resolveWorkspace } from '../../config/paths.js';
import type { CreateInput } from '../schemas.js';
import type { TanaApiNode } from '../../types.js';

export interface CreateResult {
  workspace: string;
  supertag: string;
  name: string;
  target: string;
  dryRun: boolean;
  validated: boolean;
  payload: TanaApiNode;
  nodeId?: string;
  error?: string;
}

export async function create(input: CreateInput): Promise<CreateResult> {
  const configManager = ConfigManager.getInstance();
  const config = configManager.getConfig();
  const workspace = resolveWorkspace(input.workspace, config);

  // Validate supertag name
  if (!input.supertag || input.supertag.trim().length === 0) {
    throw new Error('Supertag name is required');
  }

  // Validate node name
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Node name is required');
  }

  // Load schema registry
  const registry = getSchemaRegistry();
  const supertags = registry.listSupertags();

  if (supertags.length === 0) {
    throw new Error(
      'Schema registry is empty. Sync it first with: supertag schema sync'
    );
  }

  // Parse supertags (handle comma-separated)
  const supertagNames = input.supertag.includes(',')
    ? input.supertag.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
    : [input.supertag];

  // Validate all supertags exist
  for (const tagName of supertagNames) {
    const schema = registry.getSupertag(tagName);
    if (!schema) {
      const similar = registry.searchSupertags(tagName);
      const suggestion =
        similar.length > 0
          ? `. Did you mean: ${similar.slice(0, 3).map((s) => s.name).join(', ')}?`
          : '';
      throw new Error(`Unknown supertag: ${tagName}${suggestion}`);
    }
  }

  // Build the node payload
  const fieldValues: Record<string, string | string[]> = {};
  if (input.fields) {
    for (const [key, value] of Object.entries(input.fields)) {
      fieldValues[key] = value;
    }
  }

  const nodePayload = registry.buildNodePayload(
    input.supertag,
    input.name,
    fieldValues
  );

  // Add children if provided (for references/links/urls)
  if (input.children && input.children.length > 0) {
    const childNodes: TanaApiNode[] = input.children.map((child) => {
      if (child.id) {
        // Reference to existing node
        return {
          dataType: 'reference' as const,
          id: child.id,
        } as unknown as TanaApiNode;
      }
      if (child.dataType === 'url') {
        // URL node - makes links clickable in Tana
        return {
          name: child.name,
          dataType: 'url' as const,
        } as unknown as TanaApiNode;
      }
      // Plain text child node
      return { name: child.name };
    });

    // Append to existing children (fields) or create new array
    nodePayload.children = nodePayload.children
      ? [...nodePayload.children, ...childNodes]
      : childNodes;
  }

  // Determine target
  const target = input.target || config.defaultTargetNode || 'INBOX';

  // Base result
  const result: CreateResult = {
    workspace: workspace.alias,
    supertag: input.supertag,
    name: input.name,
    target,
    dryRun: input.dryRun ?? false,
    validated: true,
    payload: nodePayload,
  };

  // If dry run, return without posting
  if (input.dryRun) {
    return result;
  }

  // Check for API token
  const apiToken = config.apiToken;
  if (!apiToken) {
    throw new Error(
      'API token not configured. Set it via: supertag config --token <token>'
    );
  }

  // Create API client and post
  const client = createApiClient(apiToken, config.apiEndpoint);

  try {
    const response = await client.postNodes(target, [nodePayload], false);

    if (response.success) {
      result.nodeId =
        response.nodeIds && response.nodeIds.length > 0
          ? response.nodeIds[0]
          : undefined;
    } else {
      result.error = 'API returned success: false';
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    throw error;
  }

  return result;
}
