#!/usr/bin/env npx tsx
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  const transport = new StdioClientTransport({
    command: 'sh',
    args: ['-c', 'npx -y mcp-remote https://mcp.linear.app/sse 2>/dev/null'],
    env: { ...process.env, LINEAR_SCOPES: 'read,write,issues:create,admin' }
  });

  const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });

  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: 'get_issue',
      arguments: { id: 'CHARIOT-2042' }
    });

    if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
      console.error('No content in result');
      return;
    }
    const textContent = result.content[0];
    if ('text' in textContent) {
      const parsed = JSON.parse(textContent.text);
      console.log('All fields in issue response:');
      console.log(Object.keys(parsed).sort().join(', '));
      console.log('\n\nCycle-related fields:');
      Object.keys(parsed).filter(k => k.toLowerCase().includes('cycle')).forEach(k => {
        console.log(`  ${k}:`, parsed[k]);
      });
    }
  } finally {
    await client.close();
  }
}

test();
