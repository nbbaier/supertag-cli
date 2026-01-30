/**
 * Backend Selection Logic
 * Spec: F-094 tana-local API Integration
 * Task: T-3.4
 *
 * Resolves which TanaBackend to use based on configuration:
 * 1. If Local API is configured and healthy -> LocalApiBackend
 * 2. If Local API fails and fallback enabled -> InputApiBackend
 * 3. If only Input API configured -> InputApiBackend
 * 4. If nothing configured -> throw structured error
 *
 * Results are cached for the session to avoid repeated health checks.
 */
import { ConfigManager } from '../config/manager';
import { InputApiBackend } from './input-api-backend';
import { LocalApiBackend } from './local-api-backend';
import { LocalApiClient } from './local-api-client';
import { StructuredError } from '../utils/structured-errors';
import type { TanaBackend } from './backend';

// =============================================================================
// Cache
// =============================================================================

let cachedBackend: TanaBackend | null = null;

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve which backend to use based on configuration.
 *
 * Resolution order:
 * 1. Return cached backend if available (unless forceRefresh)
 * 2. If useInputApiFallback is set and no local API token -> Input API
 * 3. If local API configured with token -> try health check
 *    a. Healthy -> LocalApiBackend (cached)
 *    b. Not healthy + fallback enabled -> InputApiBackend (cached)
 *    c. Not healthy + no fallback -> throw LOCAL_API_UNAVAILABLE
 * 4. No local API configured -> InputApiBackend (requires apiToken)
 *
 * @param options - Optional settings
 * @param options.forceRefresh - Bypass cache and re-resolve
 * @returns Resolved TanaBackend instance
 * @throws StructuredError with code LOCAL_API_UNAVAILABLE or API_KEY_MISSING
 */
export async function resolveBackend(
  options?: { forceRefresh?: boolean },
): Promise<TanaBackend> {
  if (cachedBackend && !options?.forceRefresh) {
    return cachedBackend;
  }

  const configManager = ConfigManager.getInstance();
  const config = configManager.getConfig();

  // If useInputApiFallback is explicitly set and localApi not configured, use Input API directly
  if (config.useInputApiFallback && !config.localApi?.bearerToken) {
    return resolveInputApiBackend(config);
  }

  // Try Local API first if configured
  const localApiConfig = configManager.getLocalApiConfig();
  if (localApiConfig.enabled && localApiConfig.bearerToken) {
    const client = new LocalApiClient({
      endpoint: localApiConfig.endpoint,
      bearerToken: localApiConfig.bearerToken,
    });

    // Health check - is Tana Desktop running with Local API enabled?
    const healthy = await client.health();
    if (healthy) {
      cachedBackend = new LocalApiBackend(client);
      return cachedBackend;
    }

    // Local API not available - try fallback to Input API
    if (config.useInputApiFallback) {
      return resolveInputApiBackend(config);
    }

    // No fallback configured - fail with actionable error
    throw new StructuredError(
      "LOCAL_API_UNAVAILABLE",
      `Cannot connect to Tana Local API at ${localApiConfig.endpoint}`,
      {
        suggestion:
          "Ensure Tana Desktop is running with Local API enabled.\n" +
          "To use legacy Input API, run: supertag config --use-input-api true",
        recovery: {
          canRetry: true,
          retryStrategy: "exponential",
        },
      },
    );
  }

  // No local API configured - fall back to Input API
  return resolveInputApiBackend(config);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Resolve to InputApiBackend, validating that an API token is available.
 *
 * @param config - Current Tana configuration
 * @returns InputApiBackend instance (cached)
 * @throws StructuredError with code API_KEY_MISSING if no token configured
 */
function resolveInputApiBackend(
  config: { apiToken?: string; apiEndpoint: string },
): TanaBackend {
  if (!config.apiToken) {
    throw new StructuredError(
      "API_KEY_MISSING",
      "No API token configured for Input API",
      {
        suggestion:
          "Set via: supertag config --token <token>\n" +
          "Or configure local API: supertag config --bearer-token <token>",
      },
    );
  }

  cachedBackend = new InputApiBackend(config.apiToken, config.apiEndpoint);
  return cachedBackend;
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clear the cached backend.
 * Call this after config changes or for testing.
 */
export function clearBackendCache(): void {
  cachedBackend = null;
}
