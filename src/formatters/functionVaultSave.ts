/**
 * Function | Vault Save Formatter
 * Reusable module for tags that include Function|Vault Save composition
 */

import type { TanaApiFieldNode, TanaApiNode } from '../types';

// Function | Vault Save Supertag ID
export const FUNCTION_VAULT_SAVE_SUPERTAG_ID = 'L6NDbyp1VMQD';

// Vault Field Attribute ID
const FIELD_VAULT = 'hjg_UYqw70ot';

// Default Vault Node ID - "Execute Stream Storage" Vault
export const DEFAULT_VAULT_ID = 'w5NUQv374T8L';

/**
 * Create Vault field node
 * @param vault Vault reference (ID or name)
 * @returns Field node
 */
export function createVaultField(vault: string): TanaApiFieldNode {
  const children: TanaApiNode[] = [];

  if (isNodeId(vault)) {
    children.push({
      name: 'Vault',
      dataType: 'reference',
      id: vault,
    });
  } else {
    children.push({
      name: vault,
    });
  }

  return {
    type: 'field',
    attributeId: FIELD_VAULT,
    children,
  };
}

/**
 * Check if a string looks like a Tana node ID
 * @param str String to check
 * @returns true if it looks like a node ID
 */
function isNodeId(str: string): boolean {
  // Tana IDs are typically alphanumeric with dashes/underscores
  // Examples: 'w5NUQv374T8L', 'kn-Rrp5j8oEf', '5mrLejJyd6ih'
  return /^[A-Za-z0-9_-]{8,}$/.test(str);
}

/**
 * Get human-readable field name for Function|Vault Save fields
 * @param attributeId Attribute ID
 * @returns Field name
 */
export function getFunctionVaultSaveFieldName(attributeId: string): string {
  if (attributeId === FIELD_VAULT) {
    return 'Vault';
  }
  return `Field ${attributeId}`;
}
