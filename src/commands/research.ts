/**
 * Research Command
 * Creates Research supertag nodes in Tana with proper field structure
 */

import { readStdin, hasStdinData } from '../parsers/stdin';
import { parseJsonSmart } from '../parsers/json';
import { createResearchNode, parseResearchFromJson } from '../formatters/research';
import { createApiClient } from '../api/client';
import { getConfig } from '../config/manager';
import { exitWithError, ParseError, ConfigError } from '../utils/errors';
import type { ResearchInput } from '../formatters/research';

/**
 * Research command options
 */
export interface ResearchOptions {
  token?: string;
  target?: string;
  dryRun?: boolean;
  verbose?: boolean;
  topic?: string;
  period?: string;
  dateRange?: string;
  articleCount?: number;
  generated?: string;
}

/**
 * Execute research command
 * @param name Research name (if provided as argument)
 * @param options Research command options
 */
export async function researchCommand(name: string | undefined, options: ResearchOptions): Promise<void> {
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
        '    tana research "Name" --token your_token_here\n\n' +
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

    // Determine input source: CLI args or stdin
    let researchInput: ResearchInput;

    if (name) {
      // Create from CLI arguments
      researchInput = {
        name,
        topic: options.topic,
        period: options.period,
        dateRange: options.dateRange,
        articleCount: options.articleCount,
        generated: options.generated,
      };

      if (options.verbose) {
        console.error('📝 Creating research from CLI arguments...');
      }
    } else if (hasStdinData()) {
      // Read from stdin (JSON)
      const input = await readStdin();

      if (options.verbose) {
        console.error('📄 Parsing JSON input...');
      }

      const json = parseJsonSmart(input);

      // Handle array or single object
      if (Array.isArray(json)) {
        if (json.length === 0) {
          throw new ParseError('Empty array provided');
        }
        if (json.length > 1) {
          throw new ParseError(
            'Multiple research nodes in array not supported yet. Please post one at a time.'
          );
        }
        researchInput = parseResearchFromJson(json[0] as Record<string, unknown>);
      } else {
        researchInput = parseResearchFromJson(json as Record<string, unknown>);
      }

      // Override with CLI options if provided
      if (options.topic) researchInput.topic = options.topic;
      if (options.period) researchInput.period = options.period;
      if (options.dateRange) researchInput.dateRange = options.dateRange;
      if (options.articleCount) researchInput.articleCount = options.articleCount;
      if (options.generated) researchInput.generated = options.generated;
    } else {
      throw new ParseError(
        'No input provided. Usage:\n\n' +
        '  From arguments:\n' +
        '    tana research "Research Title" --topic "AI" --period "2025-11"\n\n' +
        '  From JSON (stdin):\n' +
        '    echo \'{"name": "Research Title", "topic": "AI"}\' | tana research\n\n' +
        '  From file:\n' +
        '    cat research.json | tana research'
      );
    }

    if (options.verbose) {
      console.error('🔧 Creating Research node...');
      console.error(`   Name: ${researchInput.name}`);
      if (researchInput.topic) console.error(`   Topic: ${Array.isArray(researchInput.topic) ? researchInput.topic.join(', ') : researchInput.topic}`);
      if (researchInput.period) console.error(`   Period: ${researchInput.period}`);
      if (researchInput.dateRange) console.error(`   Date Range: ${researchInput.dateRange}`);
      if (researchInput.articleCount) console.error(`   Article Count: ${researchInput.articleCount}`);
      if (researchInput.generated) console.error(`   Generated: ${researchInput.generated}`);
      console.error('');
    }

    // Create Research node
    const node = createResearchNode(researchInput);

    // Dry run: just show what would be posted
    if (options.dryRun) {
      console.log('🔍 Dry run - would post:');
      console.log(JSON.stringify({ targetNodeId: targetNode, nodes: [node] }, null, 2));
      console.error('');
      console.error('✅ Validation successful. Use without --dry-run to post.');
      return;
    }

    // Post to Tana
    if (options.verbose) {
      console.error('🚀 Posting to Tana...');
    }

    const client = createApiClient(apiToken, apiEndpoint);
    const response = await client.postNodes(targetNode, [node], options.verbose);

    if (options.verbose) {
      console.error('');
      console.error('✅ Successfully posted Research node to Tana!');
      console.error(`   API Response: ${JSON.stringify(response)}`);
    } else {
      console.error('✅ Successfully posted Research node to Tana');
    }

  } catch (error) {
    if (error instanceof ConfigError || error instanceof ParseError) {
      exitWithError(error.message);
    }
    exitWithError(`Failed to post research: ${(error as Error).message}`);
  }
}
