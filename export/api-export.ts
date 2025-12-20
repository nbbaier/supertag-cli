#!/usr/bin/env bun
/**
 * Tana API-based Export
 *
 * Uses Tana's private API to export workspace data directly,
 * bypassing browser automation entirely.
 *
 * Flow:
 * 1. Extract Firebase auth token from browser session
 * 2. GET /api/account → get workspace rootFileIds
 * 3. GET /api/workspaces/{rootFileId}/snapshotmeta → get metadata
 * 4. GET /api/workspaces/{rootFileId}/snapshot?type=url → get download URL
 * 5. Download the snapshot
 */

import { chromium } from 'playwright';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const USER_DATA_DIR = join(homedir(), '.config', 'tana', 'browser-data');
const TANA_API_BASE = 'https://app.tana.inc/api';

interface FirebaseAuthData {
  accessToken: string;
  refreshToken: string;
  expirationTime: number;
}

interface TanaAccount {
  workspaces?: Array<{
    rootFileId: string;
    name?: string;
  }>;
  [key: string]: unknown;
}

interface SnapshotMeta {
  id?: string;
  name?: string;
  size?: number;
  [key: string]: unknown;
}

interface SnapshotResponse {
  url?: string;
  [key: string]: unknown;
}

/**
 * Extract Firebase auth token from browser's IndexedDB
 */
async function getAuthToken(): Promise<FirebaseAuthData | null> {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
  });

  try {
    const page = context.pages()[0] || await context.newPage();
    await page.goto('https://app.tana.inc', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const firebaseData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('firebaseLocalStorageDb');
        request.onsuccess = () => {
          const db = request.result;
          try {
            const tx = db.transaction('firebaseLocalStorage', 'readonly');
            const store = tx.objectStore('firebaseLocalStorage');
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              resolve(getAllRequest.result);
            };
            getAllRequest.onerror = () => resolve([]);
          } catch (e) {
            resolve([]);
          }
        };
        request.onerror = () => resolve([]);
      });
    });

    if (Array.isArray(firebaseData)) {
      for (const item of firebaseData) {
        if (item?.value?.stsTokenManager) {
          const { accessToken, refreshToken, expirationTime } = item.value.stsTokenManager;
          return { accessToken, refreshToken, expirationTime };
        }
      }
    }

    return null;
  } finally {
    await context.close();
  }
}

/**
 * Make authenticated API request to Tana
 */
async function tanaApi<T>(endpoint: string, token: string): Promise<T> {
  const url = `${TANA_API_BASE}${endpoint}`;
  console.log(`→ GET ${endpoint}`);

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
 * Download file from URL
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`→ Downloading to ${destPath}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  writeFileSync(destPath, Buffer.from(buffer));

  const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(1);
  console.log(`✓ Downloaded ${sizeMB}MB`);
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('-v') || args.includes('--verbose');

  console.log('Tana API Export\n');

  // Step 1: Get auth token
  console.log('Step 1: Extracting auth token from browser session...');
  const auth = await getAuthToken();

  if (!auth) {
    console.error('❌ No auth token found. Run supertag-export login first.');
    process.exit(1);
  }

  // Check if token is expired
  if (auth.expirationTime < Date.now()) {
    console.error('❌ Auth token expired. Please login to Tana in browser to refresh.');
    process.exit(1);
  }

  const expiresIn = Math.round((auth.expirationTime - Date.now()) / 1000 / 60);
  console.log(`✓ Token valid (expires in ${expiresIn} minutes)\n`);

  // Step 2: Get account info
  console.log('Step 2: Fetching account info...');
  const account = await tanaApi<TanaAccount>('/account', auth.accessToken);

  if (verbose) {
    console.log('Account response:');
    console.log(JSON.stringify(account, null, 2));
  }

  // Extract workspaces/rootFileIds from account
  console.log('\nAccount data received. Looking for workspaces...');

  // The structure may vary - let's explore what we get
  console.log('Keys in account:', Object.keys(account));

  // Try to find rootFileId in the response
  const rootFileId = (account as any).rootFileId ||
                     (account as any).defaultWorkspace?.rootFileId ||
                     (account as any).workspaces?.[0]?.rootFileId;

  if (!rootFileId) {
    console.log('\nFull account response for debugging:');
    console.log(JSON.stringify(account, null, 2));
    console.error('\n❌ Could not find rootFileId in account response');
    process.exit(1);
  }

  console.log(`✓ Found rootFileId: ${rootFileId}\n`);

  // Step 3: Get snapshot metadata
  console.log('Step 3: Fetching snapshot metadata...');
  const meta = await tanaApi<SnapshotMeta>(`/workspaces/${rootFileId}/snapshotmeta`, auth.accessToken);

  console.log('Snapshot meta:', JSON.stringify(meta, null, 2));

  // Step 4: Get download URL
  console.log('\nStep 4: Getting snapshot download URL...');
  const snapshot = await tanaApi<SnapshotResponse>(`/workspaces/${rootFileId}/snapshot?type=url`, auth.accessToken);

  if (verbose) {
    console.log('Snapshot response:', JSON.stringify(snapshot, null, 2));
  }

  if (!snapshot.url) {
    console.error('❌ No download URL in snapshot response');
    console.log(JSON.stringify(snapshot, null, 2));
    process.exit(1);
  }

  console.log(`✓ Got download URL\n`);

  // Step 5: Download
  console.log('Step 5: Downloading snapshot...');
  const exportDir = join(homedir(), 'Documents', 'Tana-Export');
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const filename = `${rootFileId}@${date}.json`;
  const destPath = join(exportDir, filename);

  await downloadFile(snapshot.url, destPath);

  console.log(`\n✅ Export complete: ${destPath}`);
}

main().catch((error) => {
  console.error('Export failed:', error.message);
  process.exit(1);
});
