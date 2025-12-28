/**
 * CreateForm Component - Form to create new todos
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface CreateFormProps {
  onSubmit: (title: string, priority?: string) => void;
  onCancel: () => void;
}

type FormField = "title" | "priority";

const PRIORITIES = ["", "low", "medium", "high"];

export function CreateForm({ onSubmit, onCancel }: CreateFormProps) {
  const [title, setTitle] = useState("");
  const [priorityIndex, setPriorityIndex] = useState(0);
  const [activeField, setActiveField] = useState<FormField>("title");

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (activeField === "title") {
      if (key.return && title.trim()) {
        setActiveField("priority");
      }
    } else if (activeField === "priority") {
      if (key.leftArrow) {
        setPriorityIndex((i) => (i > 0 ? i - 1 : PRIORITIES.length - 1));
      } else if (key.rightArrow) {
        setPriorityIndex((i) => (i < PRIORITIES.length - 1 ? i + 1 : 0));
      } else if (key.return) {
        const priority = PRIORITIES[priorityIndex] || undefined;
        onSubmit(title.trim(), priority);
      } else if (key.upArrow) {
        setActiveField("title");
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Create New Todo
      </Text>

      <Box marginTop={1} flexDirection="column">
        {/* Title field */}
        <Box>
          <Text bold color={activeField === "title" ? "green" : undefined}>
            Title:{" "}
          </Text>
          {activeField === "title" ? (
            <TextInput
              value={title}
              onChange={setTitle}
              placeholder="Enter todo title..."
            />
          ) : (
            <Text>{title}</Text>
          )}
        </Box>

        {/* Priority field */}
        <Box marginTop={1}>
          <Text bold color={activeField === "priority" ? "green" : undefined}>
            Priority:{" "}
          </Text>
          {activeField === "priority" ? (
            <PrioritySelector selectedIndex={priorityIndex} />
          ) : (
            <Text dimColor>Press Enter to continue</Text>
          )}
        </Box>

        {/* Instructions */}
        <Box marginTop={2}>
          {activeField === "title" && (
            <Text dimColor>Enter title, then press Enter to set priority</Text>
          )}
          {activeField === "priority" && (
            <Text dimColor>
              Use arrow keys to select priority, Enter to create
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

interface PrioritySelectorProps {
  selectedIndex: number;
}

function PrioritySelector({ selectedIndex }: PrioritySelectorProps) {
  return (
    <Box>
      {PRIORITIES.map((priority, index) => {
        const isSelected = index === selectedIndex;
        const label = priority || "none";
        return (
          <Box key={label} marginRight={1}>
            <Text
              color={isSelected ? "green" : undefined}
              bold={isSelected}
              inverse={isSelected}
            >
              {" "}
              {label}{" "}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
