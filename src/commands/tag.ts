/**
 * Tag Mutation Command - Add/remove tags on nodes, create new supertags
 * Spec: F-094 tana-local API Integration
 * Tasks: T-4.4, T-4.5
 *
 * Note: This is `supertag tag` (singular, mutations).
 * Different from `supertag tags` (plural, queries).
 */
import { Command } from 'commander';
import { resolveBackend } from '../api/backend-resolver';
import { exitWithError } from '../utils/errors';

export function createTagCommand(): Command {
  const tag = new Command('tag');
  tag.description('Tag operations: add/remove tags on nodes, create new supertags (requires local API)');

  // supertag tag add <nodeId> <tagNameOrId>
  tag
    .command('add <nodeId> <tagNameOrId>')
    .description('Add a tag to a node')
    .option('--tag-id', 'Treat the second argument as a tag ID (skip name resolution)')
    .action(async (nodeId: string, tagNameOrId: string, options: { tagId?: boolean }) => {
      try {
        const backend = await resolveBackend();
        if (!backend.supportsMutations()) {
          console.error('Error: Tag operations require the local API backend.');
          console.error('Configure with: supertag config --bearer-token <token>');
          process.exit(1);
        }

        // If --tag-id flag is set, use the value directly as a tag ID
        // Otherwise, use as tag ID too (name resolution requires DB lookup which we'll add later)
        const tagId = tagNameOrId;

        const result = await backend.addTags(nodeId, [tagId]);
        console.log(`Added tag to ${result.nodeName} (${result.nodeId}):`);
        for (const r of result.results) {
          const status = r.success ? '  +' : '  !';
          console.log(`${status} ${r.tagName}: ${r.message}`);
        }
      } catch (error) {
        exitWithError(error);
      }
    });

  // supertag tag remove <nodeId> <tagNameOrId>
  tag
    .command('remove <nodeId> <tagNameOrId>')
    .description('Remove a tag from a node')
    .option('--tag-id', 'Treat the second argument as a tag ID (skip name resolution)')
    .action(async (nodeId: string, tagNameOrId: string, options: { tagId?: boolean }) => {
      try {
        const backend = await resolveBackend();
        if (!backend.supportsMutations()) {
          console.error('Error: Tag operations require the local API backend.');
          console.error('Configure with: supertag config --bearer-token <token>');
          process.exit(1);
        }

        const tagId = tagNameOrId;

        const result = await backend.removeTags(nodeId, [tagId]);
        console.log(`Removed tag from ${result.nodeName} (${result.nodeId}):`);
        for (const r of result.results) {
          const status = r.success ? '  -' : '  !';
          console.log(`${status} ${r.tagName}: ${r.message}`);
        }
      } catch (error) {
        exitWithError(error);
      }
    });

  // supertag tag create <name>
  // This one needs direct access to the LocalApiClient since createTag isn't on TanaBackend
  tag
    .command('create <name>')
    .description('Create a new supertag')
    .option('--description <text>', 'Tag description')
    .option('--extends <tagId>', 'Extend from an existing tag (by ID)')
    .option('--checkbox', 'Enable done checkbox on nodes with this tag')
    .option('--workspace <id>', 'Workspace ID (uses first workspace by default)')
    .action(async (name: string, options: { description?: string; extends?: string; checkbox?: boolean; workspace?: string }) => {
      try {
        // For tag creation, we need the LocalApiClient directly
        const { ConfigManager } = await import('../config/manager');
        const { LocalApiClient } = await import('../api/local-api-client');

        const configManager = ConfigManager.getInstance();
        const localApiConfig = configManager.getLocalApiConfig();

        if (!localApiConfig.bearerToken) {
          console.error('Error: Tag creation requires a local API bearer token.');
          console.error('Configure with: supertag config --bearer-token <token>');
          process.exit(1);
        }

        const client = new LocalApiClient({
          endpoint: localApiConfig.endpoint,
          bearerToken: localApiConfig.bearerToken,
        });

        // Get workspace ID
        let workspaceId = options.workspace;
        if (!workspaceId) {
          const workspaces = await client.listWorkspaces();
          if (workspaces.length === 0) {
            console.error('Error: No workspaces found');
            process.exit(1);
          }
          workspaceId = workspaces[0].id;
        }

        const result = await client.createTag(workspaceId, {
          name,
          description: options.description,
          extendsTagIds: options.extends ? [options.extends] : [],
          showCheckbox: options.checkbox,
        });

        console.log(`Created tag: ${result.tagName} (${result.tagId})`);
        if (result.extendsTagNames && result.extendsTagNames.length > 0) {
          console.log(`  Extends: ${result.extendsTagNames.join(', ')}`);
        }
      } catch (error) {
        exitWithError(error);
      }
    });

  return tag;
}
