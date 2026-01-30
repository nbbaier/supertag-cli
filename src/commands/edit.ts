/**
 * Edit Command - Update existing node name/description
 * Spec: F-094 tana-local API Integration
 * Task: T-4.3
 */
import { Command } from 'commander';
import { resolveBackend } from '../api/backend-resolver';
import { exitWithError } from '../utils/errors';

export function createEditCommand(): Command {
  const edit = new Command('edit');
  edit
    .description('Update an existing node name or description (requires local API)')
    .argument('<nodeId>', 'Node ID to update')
    .option('--name <name>', 'New node name')
    .option('--description <text>', 'New node description')
    .action(async (nodeId: string, options: { name?: string; description?: string }) => {
      try {
        if (!options.name && !options.description) {
          console.error('Error: At least one of --name or --description is required');
          process.exit(1);
        }

        const backend = await resolveBackend();
        if (!backend.supportsMutations()) {
          console.error('Error: Node editing requires the local API backend.');
          console.error('Configure with: supertag config --bearer-token <token>');
          process.exit(1);
        }

        const update: { name?: string | null; description?: string | null } = {};
        if (options.name !== undefined) update.name = options.name;
        if (options.description !== undefined) update.description = options.description;

        const result = await backend.updateNode(nodeId, update);
        console.log(`Updated node: ${result.nodeId}`);
        if (result.name !== undefined) console.log(`  Name: ${result.name}`);
        if (result.description !== undefined) console.log(`  Description: ${result.description}`);
      } catch (error) {
        exitWithError(error);
      }
    });

  return edit;
}
