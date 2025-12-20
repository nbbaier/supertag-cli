#!/usr/bin/env bun
/**
 * Extract Tana Bearer token from browser session
 */

import { chromium } from 'playwright';
import { join } from 'path';
import { homedir } from 'os';

const USER_DATA_DIR = join(homedir(), '.config', 'tana', 'browser-data');

async function getToken(): Promise<void> {
  console.log('Opening browser session to extract token...\n');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
  });

  try {
    const page = context.pages()[0] || await context.newPage();

    // Navigate to Tana to ensure we're in the right context
    await page.goto('https://app.tana.inc', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check localStorage
    console.log('=== localStorage ===');
    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const value = window.localStorage.getItem(key);
          // Look for token-related keys
          if (key.toLowerCase().includes('token') ||
              key.toLowerCase().includes('auth') ||
              key.toLowerCase().includes('session') ||
              key.toLowerCase().includes('user') ||
              key.toLowerCase().includes('firebase') ||
              key.toLowerCase().includes('credential')) {
            items[key] = value?.substring(0, 100) + (value && value.length > 100 ? '...' : '') || '';
          }
        }
      }
      return items;
    });

    for (const [key, value] of Object.entries(localStorage)) {
      console.log(`${key}: ${value}`);
    }

    // Check sessionStorage
    console.log('\n=== sessionStorage ===');
    const sessionStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          const value = window.sessionStorage.getItem(key);
          if (key.toLowerCase().includes('token') ||
              key.toLowerCase().includes('auth') ||
              key.toLowerCase().includes('session')) {
            items[key] = value?.substring(0, 100) + (value && value.length > 100 ? '...' : '') || '';
          }
        }
      }
      return items;
    });

    for (const [key, value] of Object.entries(sessionStorage)) {
      console.log(`${key}: ${value}`);
    }

    // Check cookies
    console.log('\n=== Cookies ===');
    const cookies = await context.cookies();
    for (const cookie of cookies) {
      if (cookie.name.toLowerCase().includes('token') ||
          cookie.name.toLowerCase().includes('auth') ||
          cookie.name.toLowerCase().includes('session')) {
        console.log(`${cookie.name}: ${cookie.value.substring(0, 50)}...`);
      }
    }

    // Try to intercept API calls to find the token
    console.log('\n=== Checking IndexedDB for Firebase auth ===');
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

    if (Array.isArray(firebaseData) && firebaseData.length > 0) {
      for (const item of firebaseData) {
        if (item && typeof item === 'object') {
          const value = item.value;
          if (value && value.spiApiKey) {
            console.log('Found Firebase auth data!');
            console.log(`API Key: ${value.spiApiKey}`);
          }
          if (value && value.stsTokenManager) {
            console.log(`Access Token: ${value.stsTokenManager.accessToken?.substring(0, 50)}...`);
            console.log(`Refresh Token: ${value.stsTokenManager.refreshToken?.substring(0, 30)}...`);
            console.log(`Expiration: ${new Date(value.stsTokenManager.expirationTime).toISOString()}`);
          }
        }
      }
    }

    // List all IndexedDB databases
    console.log('\n=== All IndexedDB databases ===');
    const databases = await page.evaluate(async () => {
      if ('databases' in indexedDB) {
        return await indexedDB.databases();
      }
      return [];
    });
    console.log(databases);

  } finally {
    await context.close();
  }
}

getToken().catch(console.error);
