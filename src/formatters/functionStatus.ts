/**
 * Function | Status (Pro) Formatter
 * Reusable module for tags that include Function|Status composition
 */

import type { TanaApiFieldNode } from '../types';

// Function | Status (Pro) Supertag ID
export const FUNCTION_STATUS_SUPERTAG_ID = 'cPzRYXdZzEHt';

// Function | Status Field Attribute IDs
const FIELD_STATUS = 'jDnCkR4gIUDx';
const FIELD_DUE_DATE = 'SYS_A61';

// Status Reference IDs
export const STATUS_VALUES = {
  active: 'Pg_ubWBIaT14',
  'next-up': 'D1MwxUp9LVa_',
  'in-review': '8j7DIVO_CAl2',
  later: '_-_ybc29Fvrr',
  complete: 'b3o2A1niaFN_',
  cancelled: 'Ja1VmVrptyXE',
  waiting: 'N3oLfaO0hlj3',
} as const;

export type StatusValue = keyof typeof STATUS_VALUES;

/**
 * Create Status field node
 * @param status Status value
 * @returns Field node
 */
export function createStatusField(status: StatusValue): TanaApiFieldNode {
  return {
    type: 'field',
    attributeId: FIELD_STATUS,
    children: [
      {
        dataType: 'reference',
        name: formatStatusName(status),
        id: STATUS_VALUES[status],
      },
    ],
  };
}

/**
 * Create Due Date field node
 * @param dueDate Date string (YYYY-MM-DD or ISO format)
 * @returns Field node
 */
export function createDueDateField(dueDate: string): TanaApiFieldNode {
  return {
    type: 'field',
    attributeId: FIELD_DUE_DATE,
    children: [
      {
        dataType: 'date',
        name: dueDate,
      },
    ],
  };
}

/**
 * Format status value for display
 * @param status Status value
 * @returns Formatted status name
 */
function formatStatusName(status: StatusValue): string {
  const names: Record<StatusValue, string> = {
    'active': 'Active',
    'next-up': 'Next Up',
    'in-review': 'In Review',
    'later': 'Later',
    'complete': 'Complete',
    'cancelled': 'Cancelled',
    'waiting': 'Waiting',
  };
  return names[status];
}

/**
 * Parse status from string (case-insensitive, flexible)
 * @param statusStr Status string
 * @returns StatusValue or undefined
 */
export function parseStatus(statusStr: string): StatusValue | undefined {
  const normalized = statusStr.toLowerCase().replace(/[_\s]/g, '-');

  // Direct match
  if (normalized in STATUS_VALUES) {
    return normalized as StatusValue;
  }

  // Aliases
  const aliases: Record<string, StatusValue> = {
    'nextup': 'next-up',
    'next': 'next-up',
    'inreview': 'in-review',
    'review': 'in-review',
    'done': 'complete',
    'finished': 'complete',
    'canceled': 'cancelled',
    'wait': 'waiting',
  };

  if (normalized in aliases) {
    return aliases[normalized];
  }

  return undefined;
}

/**
 * Get human-readable field name for Function|Status fields
 * @param attributeId Attribute ID
 * @returns Field name
 */
export function getFunctionStatusFieldName(attributeId: string): string {
  const fieldMap: Record<string, string> = {
    'jDnCkR4gIUDx': 'Status',
    'SYS_A61': 'Due Date',
  };
  return fieldMap[attributeId] || `Field ${attributeId}`;
}
