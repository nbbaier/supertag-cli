/**
 * Set-Field Command - Set field values on existing nodes
 * Spec: F-094 tana-local API Integration
 * Task: T-4.6
 */
import { Command } from 'commander';
import { resolveBackend } from '../api/backend-resolver';
import { exitWithError } from '../utils/errors';

export function createSetFieldCommand(): Command {
  const setField = new Command('set-field');
  setField
    .description('Set a field value on an existing node (requires local API)')
    .argument('<nodeId>', 'Node ID to update')
    .argument('<fieldName>', 'Field name or attribute ID')
    .argument('<value>', 'Field value to set')
    .option('--field-id <id>', 'Use attribute ID directly (bypass name resolution)')
    .option('--option-id <id>', 'Set as option field with this option ID')
    .action(async (nodeId: string, fieldName: string, value: string, options: { fieldId?: string; optionId?: string }) => {
      try {
        const backend = await resolveBackend();
        if (!backend.supportsMutations()) {
          console.error('Error: Setting fields requires the local API backend.');
          console.error('Configure with: supertag config --bearer-token <token>');
          process.exit(1);
        }

        const attributeId = options.fieldId || fieldName;

        if (options.optionId) {
          // Option field
          const result = await backend.setFieldOption(nodeId, attributeId, options.optionId);
          console.log(`Set option field on node ${result.nodeId}`);
          console.log(`  Field: ${result.attributeId}`);
          console.log(`  Option: ${result.optionName}`);
        } else {
          // Content field (text, number, date, url, email)
          const result = await backend.setFieldContent(nodeId, attributeId, value);
          console.log(`Set field on node ${result.nodeId}`);
          console.log(`  Field: ${result.attributeId}`);
          console.log(`  Value: ${result.content}`);
        }
      } catch (error) {
        exitWithError(error);
      }
    });

  return setField;
}
