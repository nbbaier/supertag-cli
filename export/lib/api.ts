/**
 * Tana API client
 *
 * Provides access to Tana's private API endpoints
 */

const TANA_API_BASE = 'https://app.tana.inc/api';

export interface TanaAccount {
  email: string;
  rootFileId: string;
  trackingId: string;
  stripeCustomerId?: string;
  intercomId?: string;
  revenueCatCustomerId?: string;
  groups?: string[];
  plan?: {
    name: string;
    productKey: string;
    status: string;
  };
  tanaUser?: {
    nodeId: string;
    onboardingCompleted: boolean;
  };
}

export interface SnapshotMeta {
  metadata: {
    workspaceId: string;
    lastUpdated: string;
    lastTxid: number;
    lastFbkey: string;
    nodeCount: number;
    changeCount: number;
    size: number;
    refIndex: boolean;
    homeNodeId: string;
    homeNodeName: string;
  };
}

export interface SnapshotUrl {
  url: string;
}

/**
 * Make authenticated API request to Tana
 */
async function apiRequest<T>(endpoint: string, token: string): Promise<T> {
  const url = `${TANA_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Get account information including rootFileId
 */
export async function getAccount(token: string): Promise<TanaAccount> {
  return apiRequest<TanaAccount>('/account', token);
}

/**
 * Get snapshot metadata for a workspace
 */
export async function getSnapshotMeta(token: string, rootFileId: string): Promise<SnapshotMeta> {
  return apiRequest<SnapshotMeta>(`/workspaces/${rootFileId}/snapshotmeta`, token);
}

/**
 * Get snapshot download URL
 */
export async function getSnapshotUrl(token: string, rootFileId: string): Promise<SnapshotUrl> {
  return apiRequest<SnapshotUrl>(`/workspaces/${rootFileId}/snapshot?type=url`, token);
}

/**
 * Download file from URL to buffer
 */
export async function downloadSnapshot(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  return response.arrayBuffer();
}
