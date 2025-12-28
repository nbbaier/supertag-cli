/**
 * Application state types for TUI Todo App
 */

import type { TodoData } from "../services/todo-service";

/**
 * Application views/screens
 */
export type AppView = "list" | "create" | "help";

/**
 * Application state
 */
export interface AppState {
  /** Current view */
  view: AppView;

  /** All todos loaded from database */
  todos: TodoData[];

  /** Currently selected todo index */
  selectedIndex: number;

  /** Search/filter query */
  filterQuery: string;

  /** Loading state */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;

  /** Status message (e.g., "Todo created successfully") */
  statusMessage: string | null;
}

/**
 * Initial application state
 */
export const initialState: AppState = {
  view: "list",
  todos: [],
  selectedIndex: 0,
  filterQuery: "",
  isLoading: true,
  error: null,
  statusMessage: null,
};

/**
 * Action types for state updates
 */
export type AppAction =
  | { type: "SET_TODOS"; payload: TodoData[] }
  | { type: "SET_SELECTED_INDEX"; payload: number }
  | { type: "SET_FILTER_QUERY"; payload: string }
  | { type: "SET_VIEW"; payload: AppView }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_STATUS"; payload: string | null }
  | { type: "SELECT_NEXT" }
  | { type: "SELECT_PREV" }
  | { type: "CLEAR_STATUS" };

/**
 * State reducer
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_TODOS":
      return {
        ...state,
        todos: action.payload,
        isLoading: false,
        // Reset selection if needed
        selectedIndex: Math.min(state.selectedIndex, Math.max(0, action.payload.length - 1)),
      };

    case "SET_SELECTED_INDEX":
      return {
        ...state,
        selectedIndex: Math.max(0, Math.min(action.payload, state.todos.length - 1)),
      };

    case "SET_FILTER_QUERY":
      return {
        ...state,
        filterQuery: action.payload,
        selectedIndex: 0, // Reset selection when filtering
      };

    case "SET_VIEW":
      return {
        ...state,
        view: action.payload,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case "SET_STATUS":
      return {
        ...state,
        statusMessage: action.payload,
      };

    case "SELECT_NEXT":
      return {
        ...state,
        selectedIndex: Math.min(state.selectedIndex + 1, state.todos.length - 1),
      };

    case "SELECT_PREV":
      return {
        ...state,
        selectedIndex: Math.max(state.selectedIndex - 1, 0),
      };

    case "CLEAR_STATUS":
      return {
        ...state,
        statusMessage: null,
      };

    default:
      return state;
  }
}

/**
 * Get the currently selected todo
 */
export function getSelectedTodo(state: AppState): TodoData | null {
  if (state.todos.length === 0) return null;
  return state.todos[state.selectedIndex] ?? null;
}

/**
 * Get filtered todos based on filter query
 */
export function getFilteredTodos(state: AppState): TodoData[] {
  if (!state.filterQuery) return state.todos;

  const query = state.filterQuery.toLowerCase();
  return state.todos.filter(
    (todo) =>
      todo.title?.toLowerCase().includes(query) ||
      todo.status?.toLowerCase().includes(query) ||
      todo.priority?.toLowerCase().includes(query)
  );
}
