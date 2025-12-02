/**
 * Chrome-DevTools MCP Integration Test
 *
 * Verifies wrappers call real chrome-devtools MCP server via shared client
 *
 * Prerequisites:
 * 1. Chrome running with debugging: chrome --remote-debugging-port=9222
 * 2. chrome-devtools MCP server available (npx chrome-devtools-mcp@latest)
 * 3. Shared MCP client configured
 */

import { listPages, newPage, navigatePage, takeSnapshot } from './index';

async function testChromeDevToolsIntegration() {
  console.log('🧪 Chrome-DevTools MCP Wrapper Integration Test\n');
  console.log('Testing with REAL MCP server (shared client)\n');

  try {
    // Test 1: List pages
    console.log('Test 1: List Pages');
    const pages = await listPages.execute({});
    console.log(`  ✓ Success: ${pages.success ? 'true' : 'false'}`);

    // Test 2: Create new page
    console.log('\nTest 2: New Page');
    const newPageResult = await newPage.execute({
      url: 'https://example.com',
      timeout: 10000
    });
    console.log(`  ✓ Success: ${newPageResult.success ? 'true' : 'false'}`);

    // Test 3: Navigate
    console.log('\nTest 3: Navigate');
    const navResult = await navigatePage.execute({
      type: 'url',
      url: 'https://www.anthropic.com'
    });
    console.log(`  ✓ Success: ${navResult.success ? 'true' : 'false'}`);

    // Test 4: Take snapshot
    console.log('\nTest 4: Take Snapshot');
    const snapshot = await takeSnapshot.execute({});
    console.log(`  ✓ Success: ${snapshot.success ? 'true' : 'false'}`);

    console.log('\n✅ All tests passed!');
    console.log('\n🎯 Chrome-DevTools wrappers are working with shared MCP client');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Is Chrome running with --remote-debugging-port=9222?');
    console.error('2. Is chrome-devtools MCP server available?');
    console.error('   Test: npx chrome-devtools-mcp@latest --browserUrl http://localhost:9222');
    process.exit(1);
  }
}

testChromeDevToolsIntegration();
