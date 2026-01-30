/**
 * MCP Tool: tana_trash_node
 * Move a node to trash
 * Spec: F-094, Task: T-5.7
 */
import { resolveBackend } from '../../api/backend-resolver';
import { handleMcpError } from '../error-handler';

export async function handleTrashNode(args: { nodeId: string }) {
  try {
    const backend = await resolveBackend();
    if (!backend.supportsMutations()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Trashing nodes requires the local API backend. Configure with: supertag config --bearer-token <token>' }],
        isError: true,
      };
    }

    const result = await backend.trashNode(args.nodeId);
    return {
      content: [{ type: 'text' as const, text: `Trashed node: ${result.nodeName} (${result.nodeId})` }],
    };
  } catch (error) {
    return handleMcpError(error);
  }
}
