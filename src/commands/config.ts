/**
 * Config Command
 * Manage configuration settings
 */

import { ConfigManager } from '../config/manager';
import { exitWithError } from '../utils/errors';
import type { ConfigOptions } from '../types';
import { logger } from '../index';

/**
 * Execute config command
 * @param options Config command options
 */
export async function configCommand(options: ConfigOptions): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();

    // Show configuration
    if (options.show) {
      showConfig(configManager);
      return;
    }

    // Update configuration
    const updates: Record<string, string> = {};
    let hasUpdates = false;

    if (options.token) {
      updates.apiToken = options.token;
      hasUpdates = true;
    }

    if (options.target) {
      updates.defaultTargetNode = options.target;
      hasUpdates = true;
    }

    if (options.endpoint) {
      updates.apiEndpoint = options.endpoint;
      hasUpdates = true;
    }

    if (hasUpdates) {
      // Save updates
      configManager.save(updates);
      logger.info(`Configuration updated: ${Object.keys(updates).join(', ')}`);
      console.log('✅ Configuration updated');
      console.log(`   Saved to: ${ConfigManager.getConfigPath()}`);
      console.log('');

      // Show updated config
      showConfig(configManager);
    } else {
      // No options provided, show current config
      logger.info('Showing current configuration');
      showConfig(configManager);
    }

  } catch (error) {
    exitWithError(error);
  }
}

/**
 * Display current configuration
 * @param configManager ConfigManager instance
 */
function showConfig(configManager: ConfigManager): void {
  const config = configManager.getConfig();
  const configPath = ConfigManager.getConfigPath();
  const configExists = ConfigManager.configExists();

  console.log('⚙️  Tana CLI Configuration');
  console.log('');
  console.log(`Config file: ${configPath}`);
  console.log(`Exists: ${configExists ? 'yes' : 'no'}`);
  console.log('');

  // Show configuration values
  console.log('Settings:');
  console.log('');

  // API Token (masked)
  if (config.apiToken) {
    const maskedToken = maskToken(config.apiToken);
    console.log(`  API Token:      ${maskedToken}`);
    console.log(`                  (set via ${getTokenSource()})`);
  } else {
    console.log('  API Token:      (not configured)');
    console.log('                  Get your token: https://app.tana.inc/?bundle=settings&panel=api');
  }
  console.log('');

  // Target Node
  console.log(`  Target Node:    ${config.defaultTargetNode}`);
  console.log(`                  (set via ${getTargetSource()})`);
  console.log('');

  // API Endpoint
  console.log(`  API Endpoint:   ${config.apiEndpoint}`);
  console.log('');

  // Show priority order
  console.log('Priority order:');
  console.log('  1. CLI flags (--token, --target)');
  console.log('  2. Environment variables (TANA_API_TOKEN, TANA_TARGET_NODE)');
  console.log('  3. Config file (~/.config/supertag/config.json)');
  console.log('  4. Defaults (INBOX)');
  console.log('');

  // Show usage examples
  console.log('Usage:');
  console.log('  tana config --show                    # Show current config');
  console.log('  tana config --token YOUR_TOKEN        # Set API token');
  console.log('  tana config --target INBOX            # Set default target');
  console.log('  tana config --endpoint https://...    # Set API endpoint');
}

/**
 * Mask API token for display
 * @param token API token
 * @returns Masked token
 */
function maskToken(token: string): string {
  if (token.length <= 8) {
    return '***';
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Determine where the API token is coming from
 * @returns Source description
 */
function getTokenSource(): string {
  if (process.env.TANA_API_TOKEN) {
    return 'environment variable';
  }
  if (ConfigManager.configExists()) {
    return 'config file';
  }
  return 'unknown';
}

/**
 * Determine where the target node is coming from
 * @returns Source description
 */
function getTargetSource(): string {
  if (process.env.TANA_TARGET_NODE) {
    return 'environment variable';
  }
  if (ConfigManager.configExists()) {
    return 'config file or default';
  }
  return 'default';
}
