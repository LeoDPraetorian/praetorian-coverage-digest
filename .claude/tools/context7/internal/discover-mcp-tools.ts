/**
 * Discover available tools from context7 MCP server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function discoverContext7Tools() {
  console.log('🔍 Discovering context7 MCP tools...\n');

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@latest'],
    env: { ...process.env, CONTEXT7_API_KEY: process.env.CONTEXT7_API_KEY || 'test' }
  });

  const client = new Client(
    { name: 'context7-discovery', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log('✓ Connected to context7 MCP server\n');

    // List available tools
    const tools = await client.listTools();

    console.log(`Found ${tools.tools.length} tools:\n`);

    tools.tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      console.log(`   Description: ${tool.description || 'N/A'}`);
      console.log(`   Input Schema:`);
      console.log(`   ${JSON.stringify(tool.inputSchema, null, 2).split('\n').join('\n   ')}`);
      console.log('');
    });

  } catch (error) {
    console.error('✗ Failed to discover tools:', error);
  } finally {
    await client.close();
  }
}

discoverContext7Tools();
