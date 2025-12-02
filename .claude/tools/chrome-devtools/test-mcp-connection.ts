/**
 * Test MCP SDK connection to chrome-devtools server
 *
 * This test verifies that:
 * 1. MCP SDK can spawn and connect to chrome-devtools MCP server
 * 2. Wrappers can make real MCP calls
 * 3. Results are returned successfully
 *
 * Prerequisites:
 * - chrome-devtools MCP server must be installed globally or available via npx
 * - A Chrome browser instance should be available
 */

import { click } from './click.js';
import { navigatePage } from './navigate-page.js';

async function testMCPConnection() {
  console.log('🧪 Testing Chrome DevTools MCP Connection...\n');

  try {
    // Test 1: Navigate to a page
    console.log('Test 1: Navigate to example.com');
    const navResult = await navigatePage.execute({
      pageId: 'test-page',
      url: 'https://example.com',
      waitUntil: 'load'
    });
    console.log('✅ Navigation successful:', navResult);
    console.log('');

    // Test 2: Click an element
    console.log('Test 2: Click an element');
    const clickResult = await click.execute({
      pageId: 'test-page',
      selector: 'a',
      button: 'left',
      clickCount: 1
    });
    console.log('✅ Click successful:', clickResult);
    console.log('');

    console.log('✅ All tests passed!');
    console.log('\nMCP SDK connection working correctly.');
    console.log('You can now DISABLE chrome-devtools MCP in Claude Code settings.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure chrome-devtools MCP server is installed:');
    console.error('   npm install -g @modelcontextprotocol/server-chrome-devtools');
    console.error('');
    console.error('2. Check if Chrome browser is running');
    console.error('');
    console.error('3. Verify the MCP server command in mcp-client.ts matches your installation');
    process.exit(1);
  }
}

// Run test
testMCPConnection();
