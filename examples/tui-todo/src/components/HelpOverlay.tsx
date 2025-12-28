/**
 * HelpOverlay Component - Shows keyboard shortcuts
 */

import React from "react";
import { Box, Text } from "ink";

interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Keyboard Shortcuts
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Section title="Navigation">
          <Shortcut key_="j" description="Move down" />
          <Shortcut key_="k" description="Move up" />
          <Shortcut key_="Down" description="Move down" />
          <Shortcut key_="Up" description="Move up" />
          <Shortcut key_="g" description="Go to first" />
          <Shortcut key_="G" description="Go to last" />
        </Section>

        <Section title="Actions">
          <Shortcut key_="n" description="Create new todo" />
          <Shortcut key_="Enter" description="View details" />
          <Shortcut key_="/" description="Search/filter" />
          <Shortcut key_="Esc" description="Clear filter" />
        </Section>

        <Section title="General">
          <Shortcut key_="?" description="Toggle help" />
          <Shortcut key_="r" description="Refresh todos" />
          <Shortcut key_="q" description="Quit" />
          <Shortcut key_="Ctrl+c" description="Force quit" />
        </Section>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>Press ? or Esc to close</Text>
      </Box>
    </Box>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold color="yellow">
        {title}
      </Text>
      <Box flexDirection="column" marginLeft={2}>
        {children}
      </Box>
    </Box>
  );
}

interface ShortcutProps {
  key_: string;
  description: string;
}

function Shortcut({ key_, description }: ShortcutProps) {
  return (
    <Box>
      <Box width={12}>
        <Text color="cyan">{key_}</Text>
      </Box>
      <Text>{description}</Text>
    </Box>
  );
}
