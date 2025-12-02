#!/usr/bin/env tsx
/**
 * Discover actual tool names from praetorian-cli MCP server
 *
 * Usage: npx tsx .claude/tools/praetorian-cli/discover-tools.ts
 */

// Note: Using shared MCP client - no discoverTools function yet
// This script needs to be rewritten to use shared client
import { callMCPTool } from '../../config/lib/mcp-client';

async function main() {
  console.log('Testing praetorian-cli MCP server connection...\n');

  try {
    // Test connection
    await testConnection();
    console.log('');

    // Discover tools
    console.log('Discovering available tools...\n');
    const tools = await discoverTools();

    console.log(`Found ${tools.length} tools:\n`);
    console.log('='.repeat(80));

    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`   Description: ${tool.description}`);
      }
      if (tool.inputSchema) {
        const params = Object.keys(tool.inputSchema.properties || {});
        if (params.length > 0) {
          console.log(`   Parameters: ${params.join(', ')}`);
        }
      }
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`\nTotal: ${tools.length} tools`);

    // Save tool names for comparison
    const toolNames = tools.map(t => t.name).sort();
    console.log('\nTool names (sorted):');
    toolNames.forEach(name => console.log(`  - ${name}`));

  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

main();
