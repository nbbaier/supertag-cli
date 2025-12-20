/**
 * Todo Node Formatter
 * Creates Tana Todo nodes with proper structure
 * Todo inherits Function|Status fields internally (composition handled by Tana)
 */

import type { TanaApiNode, TanaApiFieldNode, TodoInput } from '../types';
import {
  createStatusField,
  createDueDateField,
  parseStatus,
  type StatusValue,
} from './functionStatus';
import {
  createVaultField,
  DEFAULT_VAULT_ID,
} from './functionVaultSave';

// Tana Todo Supertag ID
const TODO_SUPERTAG_ID = 'fbAkgDqs3k';

// Tana Field Attribute IDs (Todo-specific)
const FIELD_PARENT = 'TIw94EJ5T-';
const FIELD_DO_DATE = 'qFXubn29lX';
const FIELD_FOCUS = 'k6q151wjIv5E';

/**
 * Create a Todo node from TodoInput
 * @param input Todo input data
 * @returns TanaApiNode formatted as a Todo
 */
export function createTodoNode(input: TodoInput): TanaApiNode {
  const children: (TanaApiNode | TanaApiFieldNode)[] = [];

  // Add Status field if provided (from Function|Status)
  if (input.status) {
    const status = parseStatus(input.status);
    if (status) {
      children.push(createStatusField(status));
    }
  }

  // Add Due Date field if provided (from Function|Status)
  if (input.dueDate) {
    children.push(createDueDateField(input.dueDate));
  }

  // Add Parent field if provided (Todo-specific)
  if (input.parent) {
    children.push(createParentField(input.parent));
  }

  // Add Do Date field if provided (Todo-specific)
  if (input.doDate) {
    children.push(createDoDateField(input.doDate));
  }

  // Add Vault field (from Function|Vault Save) - default to "Execute Stream Storage" vault
  const vaultValue = input.vault || DEFAULT_VAULT_ID;
  children.push(createVaultField(vaultValue));

  // Add Focus field if provided (Todo-specific)
  if (input.focus) {
    children.push(createFocusField(input.focus));
  }

  const todoNode: TanaApiNode = {
    name: input.name,
    // Only use Todo supertag - it inherits Function|Status fields internally
    supertags: [
      { id: TODO_SUPERTAG_ID },
    ],
    children: children.length > 0 ? children : undefined,
  };

  // Add description if provided
  if (input.description) {
    todoNode.description = input.description;
  }

  return todoNode;
}

/**
 * Create Parent field node
 * @param parent Parent reference (ID or name)
 * @returns Field node
 */
function createParentField(parent: string): TanaApiFieldNode {
  const children: TanaApiNode[] = [];

  // Check if parent is an ID or name
  if (isNodeId(parent)) {
    // Reference by ID
    children.push({
      name: 'Parent Task',
      dataType: 'reference',
      id: parent,
    });
  } else {
    // Reference by name (Tana will resolve or create)
    children.push({
      name: parent,
    });
  }

  return {
    type: 'field',
    attributeId: FIELD_PARENT,
    children,
  };
}

/**
 * Create Do Date field node
 * @param doDate Date string (YYYY-MM-DD or ISO format)
 * @returns Field node
 */
function createDoDateField(doDate: string): TanaApiFieldNode {
  return {
    type: 'field',
    attributeId: FIELD_DO_DATE,
    children: [
      {
        dataType: 'date',
        name: doDate,
      },
    ],
  };
}

/**
 * Create Focus field node
 * @param focus Focus reference (ID or name)
 * @returns Field node
 */
function createFocusField(focus: string): TanaApiFieldNode {
  const children: TanaApiNode[] = [];

  if (isNodeId(focus)) {
    children.push({
      name: 'Focus',
      dataType: 'reference',
      id: focus,
    });
  } else {
    children.push({
      name: focus,
    });
  }

  return {
    type: 'field',
    attributeId: FIELD_FOCUS,
    children,
  };
}

/**
 * Check if a string looks like a Tana node ID
 * Tana IDs are alphanumeric with dashes/underscores
 * @param str String to check
 * @returns true if it looks like a node ID
 */
function isNodeId(str: string): boolean {
  // Tana IDs are typically short alphanumeric with dashes/underscores
  // Examples: 'SYS_A82Hk3Nl', 'kn-Rrp5j8oEf', '5mrLejJyd6ih'
  return /^[A-Za-z0-9_-]{8,}$/.test(str);
}

/**
 * Parse Todo from generic JSON
 * @param json JSON object
 * @returns TodoInput
 */
export function parseTodoFromJson(json: Record<string, unknown>): TodoInput {
  const input: TodoInput = {
    name: extractName(json),
  };

  // Extract optional fields
  if (json.description && typeof json.description === 'string') {
    input.description = json.description;
  }

  // Status field (from Function|Status)
  if (json.status && typeof json.status === 'string') {
    input.status = json.status;
  }

  // Due Date field (from Function|Status)
  if (json.dueDate && typeof json.dueDate === 'string') {
    input.dueDate = json.dueDate;
  } else if (json.due_date && typeof json.due_date === 'string') {
    input.dueDate = json.due_date;
  } else if (json.due && typeof json.due === 'string') {
    input.dueDate = json.due;
  }

  // Do Date field (Todo-specific)
  if (json.doDate && typeof json.doDate === 'string') {
    input.doDate = json.doDate;
  } else if (json.do_date && typeof json.do_date === 'string') {
    input.doDate = json.do_date;
  } else if (json.date && typeof json.date === 'string') {
    input.doDate = json.date;
  }

  if (json.focus && typeof json.focus === 'string') {
    input.focus = json.focus;
  }

  if (json.vault && typeof json.vault === 'string') {
    input.vault = json.vault;
  }

  if (json.parent && typeof json.parent === 'string') {
    input.parent = json.parent;
  }

  return input;
}

/**
 * Extract name from JSON object
 * @param json JSON object
 * @returns Name string
 */
function extractName(json: Record<string, unknown>): string {
  const nameFields = ['name', 'title', 'label', 'heading', 'subject', 'summary', 'task'];

  for (const field of nameFields) {
    if (field in json && typeof json[field] === 'string' && json[field]) {
      return json[field] as string;
    }
  }

  throw new Error('No valid name field found in JSON (expected: name, title, label, etc.)');
}
