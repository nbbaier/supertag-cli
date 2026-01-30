/**
 * Config Command
 * Manage configuration settings
 */

import { ConfigManager } from '../config/manager';
import { exitWithError } from '../utils/errors';
import type { ConfigOptions } from '../types';
import { logger } from '../index';

/**
 * Extended config options including local API (F-094)
 */
export interface ExtendedConfigOptions extends ConfigOptions {
  /** Set bearer token for local API */
  bearerToken?: string;
  /** Set local API endpoint URL */
  localApiUrl?: string;
  /** Enable/disable Input API fallback */
  useInputApi?: string;
}

/**
 * Execute config command
 * @param options Config command options
 */
export async function configCommand(options: ExtendedConfigOptions): Promise<void> {
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

    // Local API configuration (F-094)
    if (options.bearerToken) {
      configManager.setLocalApiBearerToken(options.bearerToken);
      hasUpdates = true;
    }

    if (options.localApiUrl) {
      configManager.setLocalApiEndpoint(options.localApiUrl);
      hasUpdates = true;
    }

    if (options.useInputApi !== undefined) {
      const enabled = options.useInputApi === 'true' || options.useInputApi === '1';
      configManager.setUseInputApiFallback(enabled);
      hasUpdates = true;
    }

    if (hasUpdates) {
      // Save updates (for non-local-api updates that use the generic save)
      if (Object.keys(updates).length > 0) {
        configManager.save(updates);
      }
      logger.info(`Configuration updated`);
      console.log('Configuration updated');
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

  // Local API settings (F-094)
  const localApiConfig = configManager.getLocalApiConfig();
  console.log('Local API (tana-local):');
  console.log(`  Enabled:        ${localApiConfig.enabled}`);
  if (localApiConfig.bearerToken) {
    console.log(`  Bearer Token:   ${maskToken(localApiConfig.bearerToken)}`);
    console.log(`                  (set via ${getLocalTokenSource()})`);
  } else {
    console.log('  Bearer Token:   (not configured)');
    console.log('                  Get token: Tana Desktop > Settings > Local API');
  }
  console.log(`  Endpoint:       ${localApiConfig.endpoint}`);
  console.log(`  Input API Fallback: ${configManager.getUseInputApiFallback()}`);
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
  console.log('  supertag config --show                     # Show current config');
  console.log('  supertag config --token YOUR_TOKEN         # Set Input API token');
  console.log('  supertag config --target INBOX             # Set default target');
  console.log('  supertag config --endpoint https://...     # Set Input API endpoint');
  console.log('  supertag config --bearer-token TOKEN       # Set local API token');
  console.log('  supertag config --local-api-url URL        # Set local API endpoint');
  console.log('  supertag config --use-input-api true       # Enable Input API fallback');
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
 * Determine where the local API token is coming from
 * @returns Source description
 */
function getLocalTokenSource(): string {
  if (process.env.TANA_LOCAL_API_TOKEN) {
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
