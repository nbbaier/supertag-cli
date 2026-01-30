/**
 * MCP Tools: tana_done, tana_undone
 * Mark nodes as done or not done
 * Spec: F-094, Task: T-5.8
 */
import { resolveBackend } from '../../api/backend-resolver';
import { handleMcpError } from '../error-handler';

export async function handleDone(args: { nodeId: string }) {
  try {
    const backend = await resolveBackend();
    if (!backend.supportsMutations()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Done/undone requires the local API backend. Configure with: supertag config --bearer-token <token>' }],
        isError: true,
      };
    }

    const result = await backend.checkNode(args.nodeId);
    return {
      content: [{ type: 'text' as const, text: `Done: ${result.nodeName} (${result.nodeId})` }],
    };
  } catch (error) {
    return handleMcpError(error);
  }
}

export async function handleUndone(args: { nodeId: string }) {
  try {
    const backend = await resolveBackend();
    if (!backend.supportsMutations()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Done/undone requires the local API backend. Configure with: supertag config --bearer-token <token>' }],
        isError: true,
      };
    }

    const result = await backend.uncheckNode(args.nodeId);
    return {
      content: [{ type: 'text' as const, text: `Undone: ${result.nodeName} (${result.nodeId})` }],
    };
  } catch (error) {
    return handleMcpError(error);
  }
}
