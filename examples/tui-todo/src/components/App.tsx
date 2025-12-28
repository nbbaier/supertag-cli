/**
 * App Component - Main application
 */

import React, { useReducer, useEffect, useState, useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { TodoList } from "./TodoList";
import { TodoDetail } from "./TodoDetail";
import { StatusBar } from "./StatusBar";
import { CreateForm } from "./CreateForm";
import { HelpOverlay } from "./HelpOverlay";
import { SearchInput } from "./SearchInput";
import { TodoService } from "../services/todo-service";
import { TanaInputApi } from "../services/tana-input-api";
import {
  appReducer,
  initialState,
  getSelectedTodo,
  getFilteredTodos,
} from "../types/app-state";

interface AppProps {
  dbPath: string;
  apiToken?: string;
  targetNodeId?: string;
}

export function App({ dbPath, apiToken, targetNodeId = "INBOX" }: AppProps) {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [todoService] = useState(() => new TodoService(dbPath));
  const [tanaApi] = useState(() =>
    apiToken
      ? new TanaInputApi({ apiToken, targetNodeId })
      : null
  );
  const [isSearchActive, setIsSearchActive] = useState(false);

  const filteredTodos = getFilteredTodos(state);
  const selectedTodo = getSelectedTodo({ ...state, todos: filteredTodos });

  // Load todos
  const loadTodos = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const todos = await todoService.getTodos();
      dispatch({ type: "SET_TODOS", payload: todos });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Failed to load todos",
      });
    }
  }, [todoService]);

  useEffect(() => {
    loadTodos();
    return () => {
      todoService.close();
    };
  }, [loadTodos, todoService]);

  // Handle todo creation
  const handleCreateTodo = useCallback(
    async (title: string, priority?: string) => {
      if (!tanaApi) {
        dispatch({
          type: "SET_STATUS",
          payload: "API token not configured. Cannot create todos.",
        });
        dispatch({ type: "SET_VIEW", payload: "list" });
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });
      const result = await tanaApi.createTodo({ title, priority });

      if (result.success) {
        dispatch({ type: "SET_STATUS", payload: `Created: "${title}"` });
        // Note: Won't appear in list until next sync, but show success
      } else {
        dispatch({
          type: "SET_STATUS",
          payload: `Failed to create: ${result.error}`,
        });
      }

      dispatch({ type: "SET_VIEW", payload: "list" });
      dispatch({ type: "SET_LOADING", payload: false });

      // Clear status after 3 seconds
      setTimeout(() => {
        dispatch({ type: "CLEAR_STATUS" });
      }, 3000);
    },
    [tanaApi]
  );

  // Keyboard input handling
  useInput(
    (input, key) => {
      // Global shortcuts
      if (key.ctrl && input === "c") {
        exit();
        return;
      }

      // Search mode handling
      if (isSearchActive) {
        if (key.escape) {
          setIsSearchActive(false);
          dispatch({ type: "SET_FILTER_QUERY", payload: "" });
          return;
        }
        if (key.return) {
          setIsSearchActive(false);
          return;
        }
        // Let TextInput handle other input
        return;
      }

      // Help view
      if (state.view === "help") {
        if (input === "?" || key.escape) {
          dispatch({ type: "SET_VIEW", payload: "list" });
        }
        return;
      }

      // Create view handled by CreateForm
      if (state.view === "create") {
        return;
      }

      // List view shortcuts
      if (input === "q") {
        exit();
        return;
      }

      if (input === "?") {
        dispatch({ type: "SET_VIEW", payload: "help" });
        return;
      }

      if (input === "n") {
        dispatch({ type: "SET_VIEW", payload: "create" });
        return;
      }

      if (input === "/") {
        setIsSearchActive(true);
        return;
      }

      if (input === "r") {
        loadTodos();
        dispatch({ type: "SET_STATUS", payload: "Refreshing..." });
        setTimeout(() => dispatch({ type: "CLEAR_STATUS" }), 1000);
        return;
      }

      if (key.escape) {
        dispatch({ type: "SET_FILTER_QUERY", payload: "" });
        return;
      }

      // Navigation
      if (input === "j" || key.downArrow) {
        dispatch({ type: "SELECT_NEXT" });
        return;
      }

      if (input === "k" || key.upArrow) {
        dispatch({ type: "SELECT_PREV" });
        return;
      }

      if (input === "g") {
        dispatch({ type: "SET_SELECTED_INDEX", payload: 0 });
        return;
      }

      if (input === "G") {
        dispatch({ type: "SET_SELECTED_INDEX", payload: filteredTodos.length - 1 });
        return;
      }
    },
    { isActive: state.view !== "create" }
  );

  // Handle search input changes
  const handleSearchChange = useCallback((value: string) => {
    dispatch({ type: "SET_FILTER_QUERY", payload: value });
  }, []);

  // Error state
  if (state.error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>
          Error: {state.error}
        </Text>
        <Text dimColor>Press q to quit, r to retry</Text>
      </Box>
    );
  }

  // Help overlay
  if (state.view === "help") {
    return (
      <Box flexDirection="column" height="100%">
        <HelpOverlay onClose={() => dispatch({ type: "SET_VIEW", payload: "list" })} />
        <StatusBar
          message={state.statusMessage}
          filterQuery={state.filterQuery}
          view={state.view}
          isLoading={state.isLoading}
        />
      </Box>
    );
  }

  // Create form
  if (state.view === "create") {
    return (
      <Box flexDirection="column" height="100%">
        <CreateForm
          onSubmit={handleCreateTodo}
          onCancel={() => dispatch({ type: "SET_VIEW", payload: "list" })}
        />
        <StatusBar
          message={state.statusMessage}
          filterQuery={state.filterQuery}
          view={state.view}
          isLoading={state.isLoading}
        />
      </Box>
    );
  }

  // Main list view
  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box paddingX={1} borderStyle="single" borderColor="cyan">
        <Text bold color="cyan">
          TUI Todo - supertag-cli Demo
        </Text>
        {!apiToken && (
          <Text dimColor> (read-only: no API token)</Text>
        )}
      </Box>

      {/* Search bar */}
      <SearchInput
        value={state.filterQuery}
        onChange={handleSearchChange}
        isActive={isSearchActive}
      />

      {/* Main content: split pane */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left pane: Todo list */}
        <Box width="50%" borderStyle="single" borderColor="gray">
          <TodoList
            todos={filteredTodos}
            selectedIndex={state.selectedIndex}
            filterQuery={state.filterQuery}
          />
        </Box>

        {/* Right pane: Todo details */}
        <Box width="50%" borderStyle="single" borderColor="gray">
          <TodoDetail todo={selectedTodo} />
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar
        message={state.statusMessage}
        filterQuery={state.filterQuery}
        view={state.view}
        isLoading={state.isLoading}
      />
    </Box>
  );
}
