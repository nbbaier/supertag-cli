/**
 * TodoDetail Component - Shows details of selected todo
 */

import React from "react";
import { Box, Text } from "ink";
import type { TodoData } from "../services/todo-service";

interface TodoDetailProps {
  todo: TodoData | null;
}

export function TodoDetail({ todo }: TodoDetailProps) {
  if (!todo) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>Select a todo to see details</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Details
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text bold>Title: </Text>
          <Text strikethrough={todo.completed} dimColor={todo.completed}>
            {todo.title}
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text bold>ID: </Text>
          <Text dimColor>{todo.id}</Text>
        </Box>

        {todo.completed !== undefined && (
          <Box marginTop={1}>
            <Text bold>Completed: </Text>
            <Text color={todo.completed ? "green" : "yellow"}>
              {todo.completed ? "Yes" : "No"}
            </Text>
          </Box>
        )}

        {todo.priority && (
          <Box marginTop={1}>
            <Text bold>Priority: </Text>
            <Text color={getPriorityColor(todo.priority)}>
              {todo.priority}
            </Text>
          </Box>
        )}

        {todo.status && (
          <Box marginTop={1}>
            <Text bold>Status: </Text>
            <Text>{todo.status}</Text>
          </Box>
        )}

        {todo.dueDate && (
          <Box marginTop={1}>
            <Text bold>Due Date: </Text>
            <Text>{todo.dueDate}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function getPriorityColor(priority: string): string {
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
