/**
 * Done/Undone Commands - Mark nodes as done or not done
 * Spec: F-094 tana-local API Integration
 * Task: T-4.8
 */
import { Command } from 'commander';
import { resolveBackend } from '../api/backend-resolver';
import { exitWithError } from '../utils/errors';

export function createDoneCommand(): Command {
  const done = new Command('done');
  done
    .description('Mark a node as done (requires local API)')
    .argument('<nodeId>', 'Node ID to mark as done')
    .action(async (nodeId: string) => {
      try {
        const backend = await resolveBackend();
        if (!backend.supportsMutations()) {
          console.error('Error: Marking done requires the local API backend.');
          console.error('Configure with: supertag config --bearer-token <token>');
          process.exit(1);
        }

        const result = await backend.checkNode(nodeId);
        console.log(`Done: ${result.nodeName} (${result.nodeId})`);
      } catch (error) {
        exitWithError(error);
      }
    });

  return done;
}

export function createUndoneCommand(): Command {
  const undone = new Command('undone');
  undone
    .description('Mark a node as not done (requires local API)')
    .argument('<nodeId>', 'Node ID to mark as not done')
    .action(async (nodeId: string) => {
      try {
        const backend = await resolveBackend();
        if (!backend.supportsMutations()) {
          console.error('Error: Marking undone requires the local API backend.');
          console.error('Configure with: supertag config --bearer-token <token>');
          process.exit(1);
        }

        const result = await backend.uncheckNode(nodeId);
        console.log(`Undone: ${result.nodeName} (${result.nodeId})`);
      } catch (error) {
        exitWithError(error);
      }
    });

  return undone;
}
