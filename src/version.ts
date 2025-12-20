/**
 * Central version management
 *
 * Single source of truth for version across all tools:
 * - supertag CLI
 * - supertag-mcp server
 * - supertag-export
 * - webhook server
 */

import packageJson from '../package.json';

export const VERSION = packageJson.version;
