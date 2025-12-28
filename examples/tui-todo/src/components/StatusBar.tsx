/**
 * StatusBar Component - Shows status and keyboard hints
 */

import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  message: string | null;
  filterQuery: string;
  view: "list" | "create" | "help";
  isLoading: boolean;
}

export function StatusBar({ message, filterQuery, view, isLoading }: StatusBarProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      {/* Status message or filter indicator */}
      <Box>
        {isLoading ? (
          <Text color="yellow">Loading...</Text>
        ) : message ? (
          <Text color="green">{message}</Text>
        ) : filterQuery ? (
          <Text>
            <Text dimColor>Filter: </Text>
            <Text color="cyan">{filterQuery}</Text>
          </Text>
        ) : (
          <Text dimColor>Ready</Text>
        )}
      </Box>

      {/* Keyboard shortcuts */}
      <Box marginTop={1}>
        <KeyboardHints view={view} />
      </Box>
    </Box>
  );
}

interface KeyboardHintsProps {
  view: "list" | "create" | "help";
}

function KeyboardHints({ view }: KeyboardHintsProps) {
  if (view === "create") {
    return (
      <Box>
        <Shortcut key_="Enter" label="Submit" />
        <Shortcut key_="Esc" label="Cancel" />
      </Box>
    );
  }

  if (view === "help") {
    return (
      <Box>
        <Shortcut key_="?" label="Close help" />
        <Shortcut key_="Esc" label="Close" />
      </Box>
    );
  }

  // List view
  return (
    <Box>
      <Shortcut key_="j/k" label="Navigate" />
      <Shortcut key_="n" label="New" />
      <Shortcut key_="/" label="Search" />
      <Shortcut key_="?" label="Help" />
      <Shortcut key_="q" label="Quit" />
    </Box>
  );
}

interface ShortcutProps {
  key_: string;
  label: string;
}

function Shortcut({ key_, label }: ShortcutProps) {
  return (
    <Box marginRight={2}>
      <Text color="cyan">[{key_}]</Text>
      <Text dimColor> {label}</Text>
    </Box>
  );
}
