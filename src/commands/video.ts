/**
 * Video Command
 * Creates Video nodes in Tana with proper field structure
 *
 * The video tag is always applied. The towatch tag is only added
 * when explicitly requested via --towatch flag or towatch: true in JSON.
 */

import { readStdin, hasStdinData } from '../parsers/stdin';
import { parseJsonSmart } from '../parsers/json';
import { createVideoNode, parseVideoFromJson, getVideoFieldName } from '../formatters/video';
import { createApiClient } from '../api/client';
import { getConfig } from '../config/manager';
import { exitWithError, ParseError, ConfigError } from '../utils/errors';
import type { VideoOptions } from '../types';
import type { VideoInput } from '../formatters/video';

/**
 * Execute video command
 * @param name Video name/title (if provided as argument)
 * @param options Video command options
 */
export async function videoCommand(name: string | undefined, options: VideoOptions): Promise<void> {
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
        '    tana video "Video Title" --url "https://..." --token your_token_here\n\n' +
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
    let videoInput: VideoInput;

    if (name && options.url) {
      // Create from CLI arguments
      videoInput = {
        name,
        url: options.url,
        summary: options.summary,
        transcript: options.transcript,
        towatch: options.towatch,
      };

      if (options.verbose) {
        console.error('📝 Creating video from CLI arguments...');
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
            'Multiple videos in array not supported yet. Please post one at a time.'
          );
        }
        videoInput = parseVideoFromJson(json[0] as Record<string, unknown>);
      } else {
        videoInput = parseVideoFromJson(json as Record<string, unknown>);
      }

      // Override with CLI options if provided
      if (options.url) videoInput.url = options.url;
      if (options.summary) videoInput.summary = options.summary;
      if (options.transcript) videoInput.transcript = options.transcript;
      if (options.towatch) videoInput.towatch = options.towatch;

    } else {
      throw new ParseError(
        'No input provided. Usage:\n\n' +
        '  From CLI:\n' +
        '    tana video "Video Title" --url "https://youtube.com/watch?v=..." --summary "..."\n\n' +
        '  From JSON:\n' +
        '    echo \'{"name": "Video Title", "url": "https://...", "summary": "..."}\' | tana video\n' +
        '    cat video.json | tana video\n\n' +
        '  With towatch tag (for videos to watch later):\n' +
        '    tana video "Video Title" --url "..." --towatch\n' +
        '    echo \'{"name": "...", "url": "...", "towatch": true}\' | tana video'
      );
    }

    // Create Video node
    const videoNode = createVideoNode(videoInput);

    if (options.verbose) {
      console.error(`   Video: ${videoInput.name}`);
      console.error(`   URL: ${videoInput.url}`);
      if (videoInput.summary) console.error(`   Summary: ${videoInput.summary.substring(0, 50)}...`);
      if (videoInput.transcript) console.error(`   Transcript: ${videoInput.transcript.length} chars`);
      if (videoInput.towatch) console.error(`   Tags: video, towatch`);
      else console.error(`   Tags: video`);
      console.error('');
    }

    // Dry run mode - just show what would be posted
    if (options.dryRun) {
      console.error('🔍 DRY RUN MODE - Not posting to API');
      console.error('');
      console.error('Would create the following Video:');
      console.error('');
      console.error(`🎬 ${videoInput.name}`);
      console.error(`   URL: ${videoInput.url}`);
      if (videoInput.summary) {
        console.error(`   Summary: ${videoInput.summary}`);
      }
      if (videoInput.transcript) {
        console.error(`   Transcript: ${videoInput.transcript.length} characters`);
      }
      console.error(`   Tags: video${videoInput.towatch ? ', towatch' : ''}`);
      console.error('');
      console.error('✅ Validation passed - ready to post');
      console.error('');
      console.error('To actually post, remove the --dry-run flag');
      return;
    }

    // Create API client and post
    const client = createApiClient(apiToken, apiEndpoint);
    const response = await client.postNodes(targetNode, [videoNode], options.verbose);

    if (response.success) {
      console.log('✅ Video created successfully in Tana');
      if (response.nodeIds && response.nodeIds.length > 0) {
        console.log(`   Node ID: ${response.nodeIds[0]}`);
      }
      if (videoInput.towatch) {
        console.log('   Tags: video, towatch');
      } else {
        console.log('   Tags: video');
      }
    } else {
      throw new Error('API returned success: false');
    }

  } catch (error) {
    exitWithError(error);
  }
}
