#!/usr/bin/env tsx
/**
 * Test assets-list wrapper with real MCP server
 *
 * Usage: npx tsx .claude/tools/praetorian-cli/test-assets-list.ts
 */

import { assetsList } from './assets-list.js';

async function main() {
  console.log('Testing assets-list wrapper with real MCP server...\n');

  try {
    // Test 1: List all assets (first page)
    console.log('Test 1: List all assets (first page)');
    console.log('=' .repeat(80));

    const result = await assetsList.execute({
      key_prefix: '',
      asset_type: '',
      pages: 1
    });

    console.log('✓ Successfully called assets_list');
    console.log('');
    console.log('Summary:');
    console.log(`  Total count: ${result.summary.total_count}`);
    console.log(`  Returned count: ${result.summary.returned_count}`);
    console.log(`  Has more: ${result.summary.has_more}`);
    console.log(`  Next offset: ${result.next_offset || 'null'}`);
    console.log(`  Estimated tokens: ${result.estimated_tokens}`);
    console.log('');
    console.log('Asset types:');
    Object.entries(result.summary.asset_types).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('');
    console.log('Statuses:');
    Object.entries(result.summary.statuses).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log('');
    console.log(`First 3 assets (of ${result.assets.length}):`);
    result.assets.slice(0, 3).forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.key}`);
      console.log(`     DNS: ${asset.dns}`);
      console.log(`     Status: ${asset.status}`);
      console.log(`     Class: ${asset.class}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✓ All tests passed');

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

main();
