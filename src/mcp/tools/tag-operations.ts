/**
 * MCP Tools: tana_tag_add, tana_tag_remove
 * Add or remove tags from nodes
 * Spec: F-094, Task: T-5.4
 */
import { resolveBackend } from '../../api/backend-resolver';
import { handleMcpError } from '../error-handler';

export async function handleTagAdd(args: { nodeId: string; tagIds: string[] }) {
  try {
    const backend = await resolveBackend();
    if (!backend.supportsMutations()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Tag operations require the local API backend. Configure with: supertag config --bearer-token <token>' }],
        isError: true,
      };
    }

    const result = await backend.addTags(args.nodeId, args.tagIds);
    const lines = [`Added tags to ${result.nodeName} (${result.nodeId}):`];
    for (const r of result.results) {
      lines.push(`  ${r.success ? '+' : '!'} ${r.tagName}: ${r.message}`);
    }
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  } catch (error) {
    return handleMcpError(error);
  }
}

export async function handleTagRemove(args: { nodeId: string; tagIds: string[] }) {
  try {
    const backend = await resolveBackend();
    if (!backend.supportsMutations()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Tag operations require the local API backend. Configure with: supertag config --bearer-token <token>' }],
        isError: true,
      };
    }

    const result = await backend.removeTags(args.nodeId, args.tagIds);
    const lines = [`Removed tags from ${result.nodeName} (${result.nodeId}):`];
    for (const r of result.results) {
      lines.push(`  ${r.success ? '-' : '!'} ${r.tagName}: ${r.message}`);
    }
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  } catch (error) {
    return handleMcpError(error);
  }
}
