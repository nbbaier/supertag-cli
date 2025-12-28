/**
 * TodoList Component - Displays list of todos
 */

import React from "react";
import { Box, Text } from "ink";
import type { TodoData } from "../services/todo-service";

interface TodoListProps {
  todos: TodoData[];
  selectedIndex: number;
  filterQuery: string;
}

export function TodoList({ todos, selectedIndex, filterQuery }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>
          {filterQuery ? `No todos matching "${filterQuery}"` : "No todos found"}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Todos ({todos.length})
      </Text>
      <Box marginTop={1} flexDirection="column">
        {todos.map((todo, index) => (
          <TodoListItem
            key={todo.id}
            todo={todo}
            isSelected={index === selectedIndex}
          />
        ))}
      </Box>
    </Box>
  );
}

interface TodoListItemProps {
  todo: TodoData;
  isSelected: boolean;
}

function TodoListItem({ todo, isSelected }: TodoListItemProps) {
  const prefix = isSelected ? ">" : " ";
  const checkbox = todo.completed ? "[x]" : "[ ]";
  const priorityIndicator = getPriorityIndicator(todo.priority);

  return (
    <Box>
      <Text color={isSelected ? "green" : undefined} bold={isSelected}>
        {prefix} {checkbox}{" "}
      </Text>
      <Text
        strikethrough={todo.completed}
        dimColor={todo.completed}
        color={isSelected ? "green" : undefined}
      >
        {todo.title}
      </Text>
      {priorityIndicator && (
        <Text color={getPriorityColor(todo.priority)}> {priorityIndicator}</Text>
      )}
    </Box>
  );
}

function getPriorityIndicator(priority?: string): string {
  if (!priority) return "";
  switch (priority.toLowerCase()) {
    case "high":
      return "!!!";
    case "medium":
      return "!!";
    case "low":
      return "!";
    default:
      return "";
  }
}

function getPriorityColor(priority?: string): string {
  if (!priority) return "white";
  switch (priority.toLowerCase()) {
    case "high":
      return "red";
    case "medium":
      return "yellow";
    case "low":
      return "blue";
    default:
      return "white";
  }
}
