#!/usr/bin/env npx tsx
/**
 * Debug script to call list_projects directly
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testListProjects() {
  // Create transport
  const transport = new StdioClientTransport({
    command: 'sh',
    args: ['-c', 'npx -y mcp-remote https://mcp.linear.app/sse 2>/dev/null'],
    env: { ...process.env, LINEAR_SCOPES: 'read,write,issues:create,admin' }
  });

  // Create client
  const client = new Client({
    name: 'linear-debug',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('Connected to Linear MCP server\n');

    // Call list_projects with no filters
    console.log('Calling list_projects with no parameters...');
    const result1 = await client.callTool({
      name: 'list_projects',
      arguments: {}
    });
    console.log('Raw result:', JSON.stringify(result1, null, 2));

    // Try with includeArchived
    console.log('\n\nCalling list_projects with includeArchived=true...');
    const result2 = await client.callTool({
      name: 'list_projects',
      arguments: { includeArchived: true }
    });
    console.log('Raw result:', JSON.stringify(result2, null, 2));

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.close();
  }
}

testListProjects().catch(console.error);
