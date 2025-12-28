/**
 * T-1.5: App State Tests
 */

import { describe, it, expect } from "bun:test";
import {
  appReducer,
  initialState,
  getSelectedTodo,
  getFilteredTodos,
  type AppState,
} from "../src/types/app-state";
import type { TodoData } from "../src/services/todo-service";

const sampleTodos: TodoData[] = [
  { id: "1", title: "Buy groceries", priority: "high", completed: false },
  { id: "2", title: "Write documentation", priority: "medium", completed: true },
  { id: "3", title: "Review PR", status: "in-review" },
];

describe("appReducer", () => {
  it("should return initial state", () => {
    expect(initialState.view).toBe("list");
    expect(initialState.todos).toEqual([]);
    expect(initialState.selectedIndex).toBe(0);
    expect(initialState.isLoading).toBe(true);
  });

  describe("SET_TODOS", () => {
    it("should set todos and clear loading", () => {
      const state = appReducer(initialState, { type: "SET_TODOS", payload: sampleTodos });
      expect(state.todos).toEqual(sampleTodos);
      expect(state.isLoading).toBe(false);
    });

    it("should clamp selectedIndex to valid range", () => {
      const stateWithSelection: AppState = { ...initialState, selectedIndex: 10 };
      const state = appReducer(stateWithSelection, { type: "SET_TODOS", payload: sampleTodos });
      expect(state.selectedIndex).toBe(2); // clamped to last index
    });
  });

  describe("SET_SELECTED_INDEX", () => {
    it("should set selected index within bounds", () => {
      const stateWithTodos: AppState = { ...initialState, todos: sampleTodos };
      const state = appReducer(stateWithTodos, { type: "SET_SELECTED_INDEX", payload: 1 });
      expect(state.selectedIndex).toBe(1);
    });

    it("should clamp to bounds", () => {
      const stateWithTodos: AppState = { ...initialState, todos: sampleTodos };

      const tooHigh = appReducer(stateWithTodos, { type: "SET_SELECTED_INDEX", payload: 100 });
      expect(tooHigh.selectedIndex).toBe(2);

      const tooLow = appReducer(stateWithTodos, { type: "SET_SELECTED_INDEX", payload: -5 });
      expect(tooLow.selectedIndex).toBe(0);
    });
  });

  describe("SET_FILTER_QUERY", () => {
    it("should set filter query and reset selection", () => {
      const stateWithSelection: AppState = { ...initialState, selectedIndex: 2 };
      const state = appReducer(stateWithSelection, { type: "SET_FILTER_QUERY", payload: "test" });
      expect(state.filterQuery).toBe("test");
      expect(state.selectedIndex).toBe(0);
    });
  });

  describe("SET_VIEW", () => {
    it("should change view", () => {
      const state = appReducer(initialState, { type: "SET_VIEW", payload: "create" });
      expect(state.view).toBe("create");
    });
  });

  describe("SELECT_NEXT / SELECT_PREV", () => {
    it("should navigate through todos", () => {
      const stateWithTodos: AppState = { ...initialState, todos: sampleTodos };

      const next1 = appReducer(stateWithTodos, { type: "SELECT_NEXT" });
      expect(next1.selectedIndex).toBe(1);

      const next2 = appReducer(next1, { type: "SELECT_NEXT" });
      expect(next2.selectedIndex).toBe(2);

      const next3 = appReducer(next2, { type: "SELECT_NEXT" });
      expect(next3.selectedIndex).toBe(2); // stays at end

      const prev = appReducer(next3, { type: "SELECT_PREV" });
      expect(prev.selectedIndex).toBe(1);
    });

    it("should not go below 0", () => {
      const stateWithTodos: AppState = { ...initialState, todos: sampleTodos };
      const state = appReducer(stateWithTodos, { type: "SELECT_PREV" });
      expect(state.selectedIndex).toBe(0);
    });
  });

  describe("SET_ERROR", () => {
    it("should set error and clear loading", () => {
      const loading: AppState = { ...initialState, isLoading: true };
      const state = appReducer(loading, { type: "SET_ERROR", payload: "Failed to load" });
      expect(state.error).toBe("Failed to load");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("SET_STATUS / CLEAR_STATUS", () => {
    it("should set and clear status message", () => {
      const state = appReducer(initialState, { type: "SET_STATUS", payload: "Todo created!" });
      expect(state.statusMessage).toBe("Todo created!");

      const cleared = appReducer(state, { type: "CLEAR_STATUS" });
      expect(cleared.statusMessage).toBeNull();
    });
  });
});

describe("getSelectedTodo", () => {
  it("should return null for empty todos", () => {
    expect(getSelectedTodo(initialState)).toBeNull();
  });

  it("should return selected todo", () => {
    const state: AppState = { ...initialState, todos: sampleTodos, selectedIndex: 1 };
    expect(getSelectedTodo(state)).toEqual(sampleTodos[1]);
  });
});

describe("getFilteredTodos", () => {
  const stateWithTodos: AppState = { ...initialState, todos: sampleTodos };

  it("should return all todos when no filter", () => {
    expect(getFilteredTodos(stateWithTodos)).toEqual(sampleTodos);
  });

  it("should filter by title", () => {
    const state: AppState = { ...stateWithTodos, filterQuery: "groceries" };
    const filtered = getFilteredTodos(state);
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe("Buy groceries");
  });

  it("should filter case-insensitively", () => {
    const state: AppState = { ...stateWithTodos, filterQuery: "DOCUMENTATION" };
    const filtered = getFilteredTodos(state);
    expect(filtered.length).toBe(1);
  });

  it("should filter by priority", () => {
    const state: AppState = { ...stateWithTodos, filterQuery: "high" };
    const filtered = getFilteredTodos(state);
    expect(filtered.length).toBe(1);
    expect(filtered[0].priority).toBe("high");
  });

  it("should filter by status", () => {
    const state: AppState = { ...stateWithTodos, filterQuery: "review" };
    const filtered = getFilteredTodos(state);
    expect(filtered.length).toBe(1);
    expect(filtered[0].status).toBe("in-review");
  });
});
