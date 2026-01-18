/**
 * Context7 MCP Integration Test
 *
 * Verifies wrappers call real context7 MCP server via shared client
 *
 * Prerequisites:
 * 1. CONTEXT7_API_KEY environment variable set
 * 2. Context7 MCP server available (npx @upstash/context7-mcp@latest)
 * 3. Shared MCP client configured
 */

import { resolveLibraryId, getLibraryDocs } from './index';

async function testContext7Integration() {
  console.log('🧪 Context7 MCP Wrapper Integration Test\n');
  console.log('Testing with REAL MCP server (shared client)\n');

  try {
    // Test 1: Resolve Library ID
    console.log('Test 1: Resolve Library ID (react)');
    const library = await resolveLibraryId.execute({
      libraryName: 'react'
    });
    console.log(`  ✓ Found ${library.totalResults} results`);
    if (library.libraries.length > 0) {
      console.log(`  ✓ First result: ${library.libraries[0].name} (${library.libraries[0].id})`);
    }

    // Test 2: Get Library Docs (if we found a library)
    if (library.libraries.length > 0) {
      console.log('\nTest 2: Get Library Docs');
      const docs = await getLibraryDocs.execute({
        context7CompatibleLibraryID: library.libraries[0].id,
        page: 1
      });
      console.log(`  ✓ Got documentation (${docs.estimatedTokens} tokens)`);
      console.log(`  ✓ Library: ${docs.libraryId}`);
    }

    console.log('\n✅ All tests passed!');
    console.log('\n🎯 Context7 wrappers are working with shared MCP client');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Is CONTEXT7_API_KEY set?');
    console.error('   export CONTEXT7_API_KEY="your-key"');
    console.error('2. Is context7 MCP server available?');
    console.error('   npx -y @upstash/context7-mcp@latest');
    process.exit(1);
  }
}

testContext7Integration();
