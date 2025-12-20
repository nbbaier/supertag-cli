#!/usr/bin/env bun
import { createApiClient } from './src/api/client';
import { getConfig } from './src/config/manager';
import type { TanaApiNode } from './src/types';

const configManager = getConfig();
const config = configManager.getConfig();

const apiToken = config.apiToken;
if (!apiToken) {
  console.error('❌ API token not configured');
  process.exit(1);
}

const targetNode = config.defaultTargetNode || 'INBOX';
const apiEndpoint = config.apiEndpoint;

const todoNode: TanaApiNode = {
  name: 'Read this node',
  supertags: [{ id: 'fbAkgDqs3k' }], // Todo supertag
  children: [
    {
      name: 'Reference',
      dataType: 'reference',
      id: 'xObCnbwHXkFE',
    },
  ],
};

const client = createApiClient(apiToken, apiEndpoint);
const response = await client.postNodes(targetNode, [todoNode], true);

if (response.success) {
  console.log('✅ Todo created successfully in Tana');
  if (response.nodeIds && response.nodeIds.length > 0) {
    console.log(`   Node ID: ${response.nodeIds[0]}`);
  }
} else {
  console.error('❌ Failed to create todo');
  process.exit(1);
}












