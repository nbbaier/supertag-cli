/**
 * MCP Tool: tana_update_node
 * Update node name and/or description
 * Spec: F-094, Task: T-5.3
 */
import { resolveBackend } from '../../api/backend-resolver';
import { handleMcpError } from '../error-handler';

export async function handleUpdateNode(args: {
  nodeId: string;
  name?: string;
  description?: string;
}) {
  try {
    const backend = await resolveBackend();
    if (!backend.supportsMutations()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Node updates require the local API backend. Configure with: supertag config --bearer-token <token>' }],
        isError: true,
      };
    }

    const update: { name?: string | null; description?: string | null } = {};
    if (args.name !== undefined) update.name = args.name;
    if (args.description !== undefined) update.description = args.description;

    const result = await backend.updateNode(args.nodeId, update);

    const parts = [`Updated node: ${result.nodeId}`];
    if (result.name !== undefined) parts.push(`Name: ${result.name}`);
    if (result.description !== undefined) parts.push(`Description: ${result.description}`);

    return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
  } catch (error) {
    return handleMcpError(error);
  }
}
