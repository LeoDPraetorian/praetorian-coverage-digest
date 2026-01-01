#!/usr/bin/env npx tsx
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testListCycles() {
  const transport = new StdioClientTransport({
    command: 'sh',
    args: ['-c', 'npx -y mcp-remote https://mcp.linear.app/sse 2>/dev/null'],
    env: { ...process.env, LINEAR_SCOPES: 'read,write,issues:create,admin' }
  });

  const client = new Client({
    name: 'linear-debug',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('Connected\n');

    // MCP expects teamId (not team)
    const result = await client.callTool({
      name: 'list_cycles',
      arguments: { teamId: 'befd896b-1910-4bc4-ab33-a2e989aea80d' }  // Chariot team ID
    });
    console.log('Raw result:', JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

testListCycles().catch(console.error);
