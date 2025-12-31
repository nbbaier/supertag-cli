/**
 * MCP Transcript Tools
 *
 * Tools for accessing meeting transcripts stored in Tana.
 * - tana_transcript_list: List meetings with transcripts
 * - tana_transcript_show: Show transcript content for a meeting
 * - tana_transcript_search: Search within transcript content
 */

import { resolveWorkspaceContext } from "../../config/workspace-resolver.js";
import {
  getMeetingsWithTranscripts,
  getTranscriptForMeeting,
  getTranscriptLines,
  searchTranscripts,
  formatTranscriptTime,
  type TranscriptSummary,
  type TranscriptLine,
} from "../../db/transcript.js";
import type {
  TranscriptListInput,
  TranscriptShowInput,
  TranscriptSearchInput,
} from "../schemas.js";
import { withDatabase } from "../../db/with-database.js";

// Response types
export interface TranscriptListResult {
  workspace: string;
  meetings: TranscriptSummary[];
  count: number;
}

export interface TranscriptShowResult {
  workspace: string;
  meeting: {
    id: string;
    name: string | null;
  };
  lines: Array<{
    id: string;
    text: string;
    speaker: string | null;
    startTime: string | null;
    endTime: string | null;
    order: number;
  }>;
  count: number;
}

export interface TranscriptSearchResult {
  workspace: string;
  query: string;
  results: Array<{
    lineId: string;
    lineText: string;
    speaker: string | null;
    meetingId: string | null;
    meetingName: string | null;
  }>;
  count: number;
}

/**
 * List meetings with transcripts
 */
export async function transcriptList(
  input: TranscriptListInput
): Promise<TranscriptListResult> {
  const workspace = resolveWorkspaceContext({ workspace: input.workspace });

  return withDatabase({ dbPath: workspace.dbPath, readonly: true }, (ctx) => {
    const meetings = getMeetingsWithTranscripts(ctx.db, {
      limit: input.limit || 20,
    });

    return {
      workspace: workspace.alias,
      meetings,
      count: meetings.length,
    };
  });
}

/**
 * Show transcript content for a meeting
 */
export async function transcriptShow(
  input: TranscriptShowInput
): Promise<TranscriptShowResult> {
  const workspace = resolveWorkspaceContext({ workspace: input.workspace });

  return withDatabase({ dbPath: workspace.dbPath, readonly: true }, (ctx) => {
    // Try to get transcript for meeting ID, or use ID directly as transcript ID
    let transcriptId = getTranscriptForMeeting(ctx.db, input.id);
    if (!transcriptId) {
      transcriptId = input.id;
    }

    // Get transcript lines
    let lines = getTranscriptLines(ctx.db, transcriptId);

    // Apply limit
    const limit = input.limit || 100;
    if (lines.length > limit) {
      lines = lines.slice(0, limit);
    }

    // Get meeting info
    const meetingInfo = ctx.db
      .query(`SELECT name FROM nodes WHERE id = ?`)
      .get(input.id) as { name: string } | null;

    // Format lines for output
    const formattedLines = lines.map((line) => ({
      id: line.id,
      text: line.text,
      speaker: line.speaker,
      startTime: line.startTime ? formatTranscriptTime(line.startTime) : null,
      endTime: line.endTime ? formatTranscriptTime(line.endTime) : null,
      order: line.order,
    }));

    return {
      workspace: workspace.alias,
      meeting: {
        id: input.id,
        name: meetingInfo?.name ?? null,
      },
      lines: formattedLines,
      count: formattedLines.length,
    };
  });
}

/**
 * Search within transcript content
 */
export async function transcriptSearch(
  input: TranscriptSearchInput
): Promise<TranscriptSearchResult> {
  const workspace = resolveWorkspaceContext({ workspace: input.workspace });

  return withDatabase({ dbPath: workspace.dbPath, readonly: true }, (ctx) => {
    const results = searchTranscripts(ctx.db, input.query, {
      limit: input.limit || 20,
    });

    return {
      workspace: workspace.alias,
      query: input.query,
      results: results.map((r) => ({
        lineId: r.lineId,
        lineText: r.lineText,
        speaker: r.speaker,
        meetingId: r.meetingId,
        meetingName: r.meetingName,
      })),
      count: results.length,
    };
  });
}
