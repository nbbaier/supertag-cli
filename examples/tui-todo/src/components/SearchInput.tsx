/**
 * SearchInput Component - Filter/search input
 */

import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
}

export function SearchInput({ value, onChange, isActive }: SearchInputProps) {
  if (!isActive && !value) {
    return null;
  }

  return (
    <Box paddingX={1} borderStyle="single" borderColor={isActive ? "cyan" : "gray"}>
      <Text color="cyan">/</Text>
      {isActive ? (
        <TextInput value={value} onChange={onChange} placeholder="Search todos..." />
      ) : (
        <Text>{value}</Text>
      )}
    </Box>
  );
}
