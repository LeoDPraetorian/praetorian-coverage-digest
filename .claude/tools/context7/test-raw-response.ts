/**
 * Test raw MCP response to see what we're actually getting
 */
import { callMCPTool } from '../config/lib/mcp-client';

async function test() {
  console.log('🔍 Testing raw Context7 MCP responses\n');

  try {
    console.log('Test 1: Raw resolve-library-id response');
    const raw = await callMCPTool<any>('context7', 'resolve-library-id', {
      libraryName: 'react'
    });

    console.log('\nRaw response type:', typeof raw);
    console.log('Raw response:', JSON.stringify(raw, null, 2));

    if (typeof raw === 'string') {
      console.log('\n⚠️  Response is a string, not an object');
    } else if (Array.isArray(raw)) {
      console.log('\n⚠️  Response is an array');
      console.log('Array length:', raw.length);
      console.log('First element:', raw[0]);
    } else {
      console.log('\n✓ Response is an object');
      console.log('Keys:', Object.keys(raw));
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

test().catch(console.error);
