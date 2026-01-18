#!/usr/bin/env tsx
/**
 * Test praetorian-cli MCP server connection
 */

import { callMCPTool } from '../config/lib/mcp-client';

async function main() {
  console.log('Testing praetorian-cli MCP server...\n');

  try {
    // Test 1: List capabilities
    console.log('Test 1: Listing capabilities...');
    const capabilities = await callMCPTool('praetorian-cli', 'capabilities_list', {});
    console.log('✓ Capabilities:', JSON.stringify(capabilities, null, 2).slice(0, 500));
    console.log('');

    // Test 2: List assets (with pagination)
    console.log('Test 2: Listing assets...');
    const assets = await callMCPTool('praetorian-cli', 'assets_list', { pages: 1 });
    console.log('✓ Assets:', JSON.stringify(assets, null, 2).slice(0, 500));
    console.log('');

    console.log('✓ All tests passed!');

  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

main();
