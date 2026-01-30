/**
 * Trash Command - Move node to trash
 * Spec: F-094 tana-local API Integration
 * Task: T-4.7
 */
import { Command } from 'commander';
import { resolveBackend } from '../api/backend-resolver';
import { exitWithError } from '../utils/errors';

export function createTrashCommand(): Command {
  const trash = new Command('trash');
  trash
    .description('Move a node to trash (requires local API)')
    .argument('<nodeId>', 'Node ID to trash')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (nodeId: string, options: { confirm?: boolean }) => {
      try {
        const backend = await resolveBackend();
        if (!backend.supportsMutations()) {
          console.error('Error: Trashing nodes requires the local API backend.');
          console.error('Configure with: supertag config --bearer-token <token>');
          process.exit(1);
        }

        // Confirmation prompt (unless --confirm flag is set)
        if (!options.confirm) {
          const readline = await import('readline');
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const answer = await new Promise<string>((resolve) => {
            rl.question(`Move node ${nodeId} to trash? [y/N] `, resolve);
          });
          rl.close();
          if (answer.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
          }
        }

        const result = await backend.trashNode(nodeId);
        console.log(`Trashed node: ${result.nodeName} (${result.nodeId})`);
      } catch (error) {
        exitWithError(error);
      }
    });

  return trash;
}
