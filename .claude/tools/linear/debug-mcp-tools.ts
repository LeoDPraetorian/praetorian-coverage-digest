#!/usr/bin/env npx tsx
/**
 * Debug script to list available tools from Linear MCP server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function listLinearTools() {
  // Start the Linear MCP server
  const serverProcess = spawn('sh', ['-c', 'npx -y mcp-remote https://mcp.linear.app/sse 2>/dev/null'], {
    stdio: ['pipe', 'pipe', 'ignore'],
    env: { ...process.env, LINEAR_SCOPES: 'read,write,issues:create,admin' }
  });

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

    // List available tools
    const toolsResponse = await client.listTools();

    console.log('Available Linear MCP Tools:');
    console.log('===========================');
    toolsResponse.tools.forEach((tool: any) => {
      console.log(`\n- ${tool.name}`);
      console.log(`  Description: ${tool.description || 'N/A'}`);
    });

    console.log(`\nTotal tools: ${toolsResponse.tools.length}`);

    // Check specifically for projects-related tools
    const projectTools = toolsResponse.tools.filter((t: any) => t.name.includes('project'));
    console.log(`\nProject-related tools: ${projectTools.length}`);
    projectTools.forEach((tool: any) => {
      console.log(`  - ${tool.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

listLinearTools().catch(console.error);
