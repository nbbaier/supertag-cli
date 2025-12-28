/**
 * TodoService - Read todos from supertag-cli SQLite database
 */

import { Database } from "bun:sqlite";

export interface TodoData {
  id: string;
  title: string;
  dueDate?: string;
  completed?: boolean;
  status?: string;
  priority?: string;
}

export class TodoService {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Get all todos, optionally filtered by search term
   */
  async getTodos(filter?: string): Promise<TodoData[]> {
    // Use the actual supertag-cli schema:
    // - tag_applications uses data_node_id (not node_id)
    // - tag_applications has tag_name directly (no need to join supertag_metadata)
    const query = `
      SELECT
        n.id,
        n.name as title,
        (SELECT value_text FROM field_values WHERE parent_id = n.id AND field_name = 'Due Date' LIMIT 1) as dueDate,
        (SELECT value_text FROM field_values WHERE parent_id = n.id AND field_name = 'Completed' LIMIT 1) as completedStr,
        (SELECT value_text FROM field_values WHERE parent_id = n.id AND field_name = 'Status' LIMIT 1) as status,
        (SELECT value_text FROM field_values WHERE parent_id = n.id AND field_name = 'Priority' LIMIT 1) as priority
      FROM nodes n
      JOIN tag_applications ta ON n.id = ta.data_node_id
      WHERE LOWER(ta.tag_name) = 'todo'
        AND n.name IS NOT NULL
        AND n.name != ''
      ${filter ? "AND LOWER(n.name) LIKE LOWER(?)" : ""}
      ORDER BY n.created DESC
    `;

    const params = filter ? [`%${filter}%`] : [];
    const rows = this.db.query(query).all(...params) as Array<{
      id: string;
      title: string;
      dueDate: string | null;
      completedStr: string | null;
      status: string | null;
      priority: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      dueDate: row.dueDate ?? undefined,
      completed: row.completedStr ? row.completedStr.toLowerCase() === "true" : undefined,
      status: row.status ?? undefined,
      priority: row.priority ?? undefined,
    }));
  }

  /**
   * Get a single todo by ID
   */
  async getTodoById(id: string): Promise<TodoData | null> {
    const query = `
      SELECT
        n.id,
        n.name as title,
        (SELECT value_text FROM field_values WHERE parent_id = n.id AND field_name = 'Due Date' LIMIT 1) as dueDate,
        (SELECT value_text FROM field_values WHERE parent_id = n.id AND field_name = 'Completed' LIMIT 1) as completedStr,
        (SELECT value_text FROM field_values WHERE parent_id = n.id AND field_name = 'Status' LIMIT 1) as status,
        (SELECT value_text FROM field_values WHERE parent_id = n.id AND field_name = 'Priority' LIMIT 1) as priority
      FROM nodes n
      JOIN tag_applications ta ON n.id = ta.data_node_id
      WHERE LOWER(ta.tag_name) = 'todo'
        AND n.name IS NOT NULL
        AND n.name != ''
        AND n.id = ?
    `;

    const row = this.db.query(query).get(id) as {
      id: string;
      title: string;
      dueDate: string | null;
      completedStr: string | null;
      status: string | null;
      priority: string | null;
    } | null;

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      dueDate: row.dueDate ?? undefined,
      completed: row.completedStr ? row.completedStr.toLowerCase() === "true" : undefined,
      status: row.status ?? undefined,
      priority: row.priority ?? undefined,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
