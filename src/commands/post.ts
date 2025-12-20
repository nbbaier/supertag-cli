/**
 * Post Command
 * Posts data to Tana via Input API
 */

import { readStdin, hasStdinData } from '../parsers/stdin';
import { parseJsonSmart } from '../parsers/json';
import { jsonToTanaNodes } from '../formatters/json';
import { createApiClient } from '../api/client';
import { getConfig } from '../config/manager';
import { exitWithError, ParseError, ConfigError } from '../utils/errors';
import type { PostOptions } from '../types';
import { logger } from '../index';

/**
 * Execute post command
 * @param options Post command options
 */
export async function postCommand(options: PostOptions): Promise<void> {
  try {
    // Load configuration
    const configManager = getConfig();
    const config = configManager.getConfig();

    // Get API token (CLI flag > env var > config file)
    const apiToken = options.token || config.apiToken;
    if (!apiToken) {
      throw new ConfigError(
        'API token not configured. Set it via:\n\n' +
        '  Environment variable:\n' +
        '    export TANA_API_TOKEN="your_token_here"\n\n' +
        '  Config file:\n' +
        '    tana config --token your_token_here\n\n' +
        '  CLI flag:\n' +
        '    tana post --token your_token_here\n\n' +
        'Get your token from: https://app.tana.inc/?bundle=settings&panel=api'
      );
    }

    // Get target node (CLI flag > env var > config file > default)
    const targetNode = options.target || config.defaultTargetNode;

    // Get API endpoint
    const apiEndpoint = config.apiEndpoint;

    if (options.verbose) {
      console.error('⚙️  Configuration:');
      console.error(`   Endpoint: ${apiEndpoint}`);
      console.error(`   Target: ${targetNode}`);
      console.error(`   Dry run: ${options.dryRun ? 'yes' : 'no'}`);
      console.error('');
    }

    // Read input from stdin
    let input: string;

    if (hasStdinData()) {
      input = await readStdin();
    } else {
      throw new ParseError(
        'No input provided. Usage:\n\n' +
        '  echo \'{"name": "My Note"}\' | tana post\n' +
        '  cat data.json | tana post\n' +
        '  tana format < input.json | tana post'
      );
    }

    if (options.verbose) {
      console.error('📄 Parsing input...');
    }

    // Parse JSON input
    const json = parseJsonSmart(input);

    // Convert JSON to TanaNodes
    const nodes = jsonToTanaNodes(json);

    if (options.verbose) {
      console.error(`   Found ${nodes.length} node(s) to post`);
      console.error('');
    }

    // Dry run mode - just show what would be posted
    if (options.dryRun) {
      logger.info(`Dry run: would post ${nodes.length} nodes to ${targetNode}`);
      console.error('🔍 DRY RUN MODE - Not posting to API');
      console.error('');
      console.error('Would post the following nodes:');
      console.error('');
      nodes.forEach((node, index) => {
        console.error(`${index + 1}. ${node.name}${node.supertag ? ` #${node.supertag}` : ''}`);
        if (node.fields) {
          Object.entries(node.fields).forEach(([key, value]) => {
            console.error(`   - ${key}: ${JSON.stringify(value)}`);
          });
        }
      });
      console.error('');
      console.error('✅ Validation passed - ready to post');
      console.error('');
      console.error('To actually post, remove the --dry-run flag');
      return;
    }

    // Create API client and post
    logger.info(`Posting ${nodes.length} nodes to Tana (target: ${targetNode})`);
    const client = createApiClient(apiToken, apiEndpoint);
    const response = await client.postNodes(targetNode, nodes, options.verbose);

    if (response.success) {
      logger.info(`Successfully posted ${response.nodeIds?.length || 0} nodes to Tana`);
      console.log('✅ Successfully posted to Tana');
      if (response.nodeIds && response.nodeIds.length > 0) {
        console.log(`   Created ${response.nodeIds.length} node(s)`);
      }
    } else {
      logger.error('Tana API returned success: false');
      throw new Error('API returned success: false');
    }

  } catch (error) {
    exitWithError(error);
  }
}
