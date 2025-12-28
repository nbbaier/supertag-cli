/**
 * T-1.3: TodoService Tests
 * TDD: RED phase - write tests before implementation
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { TodoService } from "../src/services/todo-service";

const testDir = join(tmpdir(), `tui-todo-test-${Date.now()}`);
const dbPath = join(testDir, "tana-index.db");

function createTestDb(): Database {
  mkdirSync(testDir, { recursive: true });
  const db = new Database(dbPath);

  // Create schema matching actual supertag-cli database
  db.run(`
    CREATE TABLE nodes (
      id TEXT PRIMARY KEY,
      name TEXT,
      parent_id TEXT,
      node_type TEXT,
      created INTEGER DEFAULT (unixepoch()),
      updated INTEGER,
      done_at INTEGER,
      raw_data TEXT
    )
  `);

  // tag_applications uses data_node_id and has tag_name directly
  db.run(`
    CREATE TABLE tag_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tuple_node_id TEXT NOT NULL,
      data_node_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      tag_name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE field_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tuple_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      field_def_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      value_node_id TEXT NOT NULL,
      value_text TEXT NOT NULL,
      value_order INTEGER DEFAULT 0,
      created INTEGER
    )
  `);

  // Insert test todos
  db.run(`
    INSERT INTO nodes (id, name, created)
    VALUES
      ('node1', 'Buy groceries', 1703980800),
      ('node2', 'Write documentation', 1703984400),
      ('node3', 'Review PR', 1703988000)
  `);

  // Tag nodes as todo (lowercase to match real Tana data)
  db.run(`
    INSERT INTO tag_applications (tuple_node_id, data_node_id, tag_id, tag_name)
    VALUES
      ('tuple1', 'node1', 'todo123', 'todo'),
      ('tuple2', 'node2', 'todo123', 'todo'),
      ('tuple3', 'node3', 'todo123', 'todo')
  `);

  // Add field values
  db.run(`
    INSERT INTO field_values (tuple_id, parent_id, field_def_id, field_name, value_node_id, value_text)
    VALUES
      ('t1', 'node1', 'f1', 'Priority', 'v1', 'high'),
      ('t2', 'node1', 'f2', 'Completed', 'v2', 'false'),
      ('t3', 'node2', 'f1', 'Priority', 'v3', 'medium'),
      ('t4', 'node2', 'f2', 'Completed', 'v4', 'true'),
      ('t5', 'node2', 'f3', 'Due Date', 'v5', '2024-01-15'),
      ('t6', 'node3', 'f4', 'Status', 'v6', 'in-review')
  `);

  return db;
}

describe("TodoService", () => {
  let db: Database;
  let service: TodoService;

  beforeAll(() => {
    db = createTestDb();
    service = new TodoService(dbPath);
  });

  afterAll(() => {
    db.close();
    service.close();
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("getTodos", () => {
    it("should return all todos", async () => {
      const todos = await service.getTodos();
      expect(todos.length).toBe(3);
    });

    it("should return todos with title from node name", async () => {
      const todos = await service.getTodos();
      const titles = todos.map((t) => t.title);
      expect(titles).toContain("Buy groceries");
      expect(titles).toContain("Write documentation");
      expect(titles).toContain("Review PR");
    });

    it("should return todos with field values", async () => {
      const todos = await service.getTodos();
      const groceries = todos.find((t) => t.title === "Buy groceries");
      expect(groceries?.priority).toBe("high");
      expect(groceries?.completed).toBe(false);
    });

    it("should parse completed boolean correctly", async () => {
      const todos = await service.getTodos();
      const docs = todos.find((t) => t.title === "Write documentation");
      expect(docs?.completed).toBe(true);
    });

    it("should filter todos by search term", async () => {
      const todos = await service.getTodos("groceries");
      expect(todos.length).toBe(1);
      expect(todos[0].title).toBe("Buy groceries");
    });

    it("should filter case-insensitively", async () => {
      const todos = await service.getTodos("DOCUMENTATION");
      expect(todos.length).toBe(1);
      expect(todos[0].title).toBe("Write documentation");
    });
  });

  describe("getTodoById", () => {
    it("should return a single todo by ID", async () => {
      const todo = await service.getTodoById("node1");
      expect(todo).not.toBeNull();
      expect(todo?.title).toBe("Buy groceries");
    });

    it("should return null for non-existent ID", async () => {
      const todo = await service.getTodoById("nonexistent");
      expect(todo).toBeNull();
    });
  });
});
