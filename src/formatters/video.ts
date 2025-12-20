/**
 * Video Node Formatter
 * Creates Tana Video nodes with proper structure
 *
 * Tag hierarchy:
 * - video (-iZ7Rsg93Q) extends resource (l6dsbtePgD) extends Stream|Links (7_xd1rm8EzdJ)
 * - towatch (K0X94wwHfQ) extends Todo (fbAkgDqs3k) - only added when explicitly requested
 *
 * Fields inherited:
 * - URL (4u_wOatpv7aM) from Stream|Links
 * - Summary (u83MRVzdU58n) from resource
 * - Transcript (QoIi0APx_znu) from video
 */

import type { TanaApiNode, TanaApiFieldNode } from '../types';

// Tana Supertag IDs
const VIDEO_SUPERTAG_ID = '-iZ7Rsg93Q';
const TOWATCH_SUPERTAG_ID = 'K0X94wwHfQ';

// Tana Field Attribute IDs
const FIELD_URL = '4u_wOatpv7aM';        // From Stream|Links
const FIELD_SUMMARY = 'u83MRVzdU58n';    // From resource
const FIELD_TRANSCRIPT = 'QoIi0APx_znu'; // From video

/**
 * Video input structure
 */
export interface VideoInput {
  /** Video title (required) */
  name: string;
  /** Video URL (required) */
  url: string;
  /** Summary of the video content */
  summary?: string;
  /** Full transcript (optional, can be large) */
  transcript?: string;
  /** Add towatch tag (for videos to watch later) */
  towatch?: boolean;
  /** Description (added as node description) */
  description?: string;
}

/**
 * Create a Video node from VideoInput
 * @param input Video input data
 * @returns TanaApiNode formatted as a Video
 */
export function createVideoNode(input: VideoInput): TanaApiNode {
  const children: (TanaApiNode | TanaApiFieldNode)[] = [];

  // Add URL field (required)
  children.push(createUrlField(input.url));

  // Add Summary field if provided
  if (input.summary) {
    children.push(createSummaryField(input.summary));
  }

  // Add Transcript field if provided
  if (input.transcript) {
    children.push(createTranscriptField(input.transcript));
  }

  // Build supertags array
  const supertags: Array<{ id: string }> = [
    { id: VIDEO_SUPERTAG_ID },
  ];

  // Optionally add towatch tag
  if (input.towatch) {
    supertags.push({ id: TOWATCH_SUPERTAG_ID });
  }

  const videoNode: TanaApiNode = {
    name: input.name,
    supertags,
    children: children.length > 0 ? children : undefined,
  };

  // Add description if provided
  if (input.description) {
    videoNode.description = input.description;
  }

  return videoNode;
}

/**
 * Create URL field node
 * @param url URL string
 * @returns Field node
 */
function createUrlField(url: string): TanaApiFieldNode {
  return {
    type: 'field',
    attributeId: FIELD_URL,
    children: [
      {
        dataType: 'url',
        name: url,
      },
    ],
  };
}

/**
 * Create Summary field node
 * @param summary Summary text
 * @returns Field node
 */
function createSummaryField(summary: string): TanaApiFieldNode {
  return {
    type: 'field',
    attributeId: FIELD_SUMMARY,
    children: [
      {
        name: summary,
      },
    ],
  };
}

/**
 * Create Transcript field node
 * @param transcript Transcript text
 * @returns Field node
 */
function createTranscriptField(transcript: string): TanaApiFieldNode {
  return {
    type: 'field',
    attributeId: FIELD_TRANSCRIPT,
    children: [
      {
        name: transcript,
      },
    ],
  };
}

/**
 * Parse Video from generic JSON
 * @param json JSON object
 * @returns VideoInput
 */
export function parseVideoFromJson(json: Record<string, unknown>): VideoInput {
  const input: VideoInput = {
    name: extractName(json),
    url: extractUrl(json),
  };

  // Extract optional fields
  if (json.summary && typeof json.summary === 'string') {
    input.summary = json.summary;
  }

  if (json.transcript && typeof json.transcript === 'string') {
    input.transcript = json.transcript;
  }

  if (json.description && typeof json.description === 'string') {
    input.description = json.description;
  }

  // Check for towatch flag
  if (json.towatch === true || json.toWatch === true || json.to_watch === true) {
    input.towatch = true;
  }

  return input;
}

/**
 * Extract name from JSON object
 * @param json JSON object
 * @returns Name string
 */
function extractName(json: Record<string, unknown>): string {
  const nameFields = ['name', 'title', 'label', 'heading', 'subject'];

  for (const field of nameFields) {
    if (field in json && typeof json[field] === 'string' && json[field]) {
      return json[field] as string;
    }
  }

  throw new Error('No valid name field found in JSON (expected: name, title, label, etc.)');
}

/**
 * Extract URL from JSON object
 * @param json JSON object
 * @returns URL string
 */
function extractUrl(json: Record<string, unknown>): string {
  const urlFields = ['url', 'link', 'href', 'videoUrl', 'video_url'];

  for (const field of urlFields) {
    if (field in json && typeof json[field] === 'string' && json[field]) {
      return json[field] as string;
    }
  }

  throw new Error('No valid URL field found in JSON (expected: url, link, href, videoUrl)');
}

/**
 * Get human-readable field name from attribute ID
 * @param attributeId Attribute ID
 * @returns Field name
 */
export function getVideoFieldName(attributeId: string): string {
  const fieldMap: Record<string, string> = {
    [FIELD_URL]: 'URL',
    [FIELD_SUMMARY]: 'Summary',
    [FIELD_TRANSCRIPT]: 'Transcript',
  };

  return fieldMap[attributeId] || `Field ${attributeId}`;
}
