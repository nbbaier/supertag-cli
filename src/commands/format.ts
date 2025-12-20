/**
 * Format Command
 * Converts JSON input to Tana Paste format
 */

import { readStdin, hasStdinData } from '../parsers/stdin';
import { parseJsonSmart, validateJsonStructure } from '../parsers/json';
import { jsonToTanaNodes } from '../formatters/json';
import { formatTanaPaste } from '../formatters/tanaPaste';
import { exitWithError, ParseError } from '../utils/errors';
import type { FormatOptions } from '../types';

/**
 * Execute format command
 * @param options Format command options
 */
export async function formatCommand(options: FormatOptions): Promise<void> {
  try {
    // Read input from stdin
    let input: string;

    if (hasStdinData()) {
      input = await readStdin();
    } else {
      throw new ParseError(
        'No input provided. Usage:\n\n' +
        '  echo \'{"name": "My Note"}\' | tana format\n' +
        '  cat data.json | tana format\n' +
        '  curl https://api.example.com/data | tana format'
      );
    }

    // Parse JSON input
    const json = parseJsonSmart(input);

    // Validate structure (warnings only, don't block)
    const validation = validateJsonStructure(json);
    if (validation.warnings.length > 0) {
      console.error('⚠️  Warnings:');
      validation.warnings.forEach(warning => {
        console.error(`   ${warning}`);
      });
      console.error('');
    }

    // Convert JSON to TanaNodes
    const nodes = jsonToTanaNodes(json);

    // Format as Tana Paste
    const output = formatTanaPaste(nodes);

    // Output to stdout
    console.log(output);

  } catch (error) {
    exitWithError(error);
  }
}
