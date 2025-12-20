#!/usr/bin/env bun
/**
 * Capture Tana API requests during app load
 *
 * This script intercepts all API requests to find workspace discovery endpoints
 */

import { chromium } from 'playwright';
import { join } from 'path';
import { homedir } from 'os';

const USER_DATA_DIR = join(homedir(), '.config', 'tana', 'browser-data');

async function captureRequests(): Promise<void> {
  console.log('Launching browser to capture Tana API requests...\n');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = context.pages()[0] || await context.newPage();

  // Collect all API requests
  const apiRequests: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    response?: {
      status: number;
      body: string;
    };
  }> = [];

  // Intercept requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('tana.inc/api') || url.includes('firestore') || url.includes('identitytoolkit')) {
      console.log(`→ ${request.method()} ${url}`);
    }
  });

  // Intercept responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('tana.inc/api')) {
      const method = response.request().method();
      console.log(`← ${response.status()} ${method} ${url}`);

      try {
        const body = await response.text();
        apiRequests.push({
          url,
          method,
          headers: response.request().headers(),
          response: {
            status: response.status(),
            body: body.substring(0, 2000), // Truncate large responses
          },
        });

        // Print interesting responses
        if (url.includes('/account') || url.includes('/workspace') || url.includes('/user')) {
          console.log('Response body:');
          try {
            const json = JSON.parse(body);
            console.log(JSON.stringify(json, null, 2).substring(0, 3000));
          } catch {
            console.log(body.substring(0, 1000));
          }
          console.log('---\n');
        }
      } catch (e) {
        // Response body not available
      }
    }
  });

  console.log('Navigating to Tana...\n');
  await page.goto('https://app.tana.inc', { waitUntil: 'networkidle' });

  console.log('\n=== Waiting 10 seconds for all requests to complete ===\n');
  await page.waitForTimeout(10000);

  console.log('\n=== Summary of API requests ===\n');
  for (const req of apiRequests) {
    console.log(`${req.method} ${req.url}`);
    if (req.response) {
      console.log(`  Status: ${req.response.status}`);
      if (req.response.body.length < 500) {
        console.log(`  Body: ${req.response.body}`);
      }
    }
    console.log('');
  }

  console.log('\nPress Ctrl+C to close or navigate to other workspaces to capture more requests...');

  // Keep browser open for manual inspection
  await new Promise(() => {}); // Wait forever until Ctrl+C
}

captureRequests().catch(console.error);
