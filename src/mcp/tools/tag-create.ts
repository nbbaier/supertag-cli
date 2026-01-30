/**
 * MCP Tool: tana_create_tag
 * Create a new supertag
 * Spec: F-094, Task: T-5.5
 */
import { handleMcpError } from '../error-handler';
import { ConfigManager } from '../../config/manager';
import { LocalApiClient } from '../../api/local-api-client';

export async function handleCreateTag(args: {
  workspaceId?: string;
  name: string;
  description?: string;
  extendsTagIds?: string[];
  showCheckbox?: boolean;
}) {
  try {
    const configManager = ConfigManager.getInstance();
    const localApiConfig = configManager.getLocalApiConfig();

    if (!localApiConfig.bearerToken) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Tag creation requires a local API bearer token. Configure with: supertag config --bearer-token <token>' }],
        isError: true,
      };
    }

    const client = new LocalApiClient({
      endpoint: localApiConfig.endpoint,
      bearerToken: localApiConfig.bearerToken,
    });

    let workspaceId = args.workspaceId;
    if (!workspaceId) {
      const workspaces = await client.listWorkspaces();
      if (workspaces.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'Error: No workspaces found' }],
          isError: true,
        };
      }
      workspaceId = workspaces[0].id;
    }

    const result = await client.createTag(workspaceId, {
      name: args.name,
      description: args.description,
      extendsTagIds: args.extendsTagIds || [],
      showCheckbox: args.showCheckbox,
    });

    const lines = [`Created tag: ${result.tagName} (${result.tagId})`];
    if (result.extendsTagNames && result.extendsTagNames.length > 0) {
      lines.push(`Extends: ${result.extendsTagNames.join(', ')}`);
    }
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  } catch (error) {
    return handleMcpError(error);
  }
}
