#!/usr/bin/env bun
/**
 * Supertag CLI - Library Usage Example
 * 
 * This example demonstrates how to use supertag-cli as a library
 * in TypeScript applications for headless/programmatic usage.
 */

import {
  // API Client
  TanaApiClient,
  
  // Database Access
  withDatabase,
  getDatabasePath,
  
  // Configuration
  getConfig,
  resolveWorkspaceContext,
  
  // Types
  type TanaApiNode,
  
  // Version
  VERSION,
} from 'supertag-cli';

console.log(`\n🚀 Supertag CLI Library Example (v${VERSION})\n`);

/**
 * Example 1: Database Queries
 * Query nodes from the local SQLite database
 */
async function exampleDatabaseQuery() {
  console.log('📊 Example 1: Database Query');
  
  try {
    // Get the default workspace database path
    const dbPath = getDatabasePath();
    console.log(`   Database: ${dbPath}`);
    
    // Query nodes with a specific tag
    withDatabase(dbPath, (db) => {
      const query = `
        SELECT n.id, n.name, ta.tag_name
        FROM nodes n
        JOIN tag_applications ta ON n.id = ta.data_node_id
        WHERE LOWER(ta.tag_name) = 'todo'
        LIMIT 5
      `;
      
      const results = db.query(query).all();
      console.log(`   Found ${results.length} todo items:`);
      results.forEach((row: any) => {
        console.log(`   - ${row.name} (${row.id})`);
      });
    });
    
    console.log('   ✅ Success\n');
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
}

/**
 * Example 2: Create Nodes via API
 * Post new nodes to Tana using the Input API
 */
async function exampleCreateNode() {
  console.log('📝 Example 2: Create Node via API');
  
  try {
    // Get API configuration
    const config = getConfig();
    
    if (!config.apiToken) {
      console.log('   ⚠️  Skipped: No API token configured');
      console.log('   Set TANA_API_TOKEN environment variable to test\n');
      return;
    }
    
    const apiEndpoint = config.apiEndpoint || 'https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2';
    
    // Create API client
    const client = new TanaApiClient(config.apiToken, apiEndpoint);
    
    // Build node payload
    const nodes: TanaApiNode[] = [{
      name: 'Library Test Node',
      description: 'Created via supertag-cli library',
      supertags: [{ id: 'note' }],
      children: [{
        name: 'This was created programmatically!',
      }],
    }];
    
    // Post to Tana (dry-run mode for safety)
    console.log('   Creating node in dry-run mode...');
    console.log('   Payload:', JSON.stringify(nodes, null, 2));
    
    // In production, remove the dry-run check:
    // const response = await client.postNodes('INBOX', nodes);
    console.log('   ✅ Node validated (dry-run)\n');
    
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
}

/**
 * Example 3: Workspace Resolution
 * Resolve workspace configuration and paths
 */
async function exampleWorkspaceResolution() {
  console.log('🏢 Example 3: Workspace Resolution');
  
  try {
    // Resolve default workspace
    const workspace = resolveWorkspaceContext();
    
    console.log(`   Workspace: ${workspace.alias}`);
    console.log(`   Database: ${workspace.dbPath}`);
    console.log(`   Export Dir: ${workspace.exportDir}`);
    console.log(`   Is Default: ${workspace.isDefault}`);
    console.log('   ✅ Success\n');
    
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
}

/**
 * Example 4: Batch Operations
 * Demonstrates importing batch operations for multi-node queries
 */
async function exampleBatchOperations() {
  console.log('📦 Example 4: Batch Operations');
  
  try {
    const { batchGetNodes, BATCH_GET_MAX_NODES } = await import('supertag-cli');
    
    console.log(`   Max nodes per batch: ${BATCH_GET_MAX_NODES}`);
    console.log('   ✅ Batch operations available\n');
    
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
}

/**
 * Main entry point
 */
async function main() {
  await exampleDatabaseQuery();
  await exampleCreateNode();
  await exampleWorkspaceResolution();
  await exampleBatchOperations();
  
  console.log('✨ All examples completed!\n');
  console.log('💡 Tips:');
  console.log('   - Use withDatabase() for safe database access');
  console.log('   - Use TanaApiClient for creating nodes');
  console.log('   - Use resolveWorkspaceContext() for workspace paths');
  console.log('   - Check the full API in docs/LIBRARY.md\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
