/**
 * Test praetorian-cli MCP connection via shared client
 */

import { assetsList } from './assets-list';

async function testConnection() {
  console.log('🧪 Testing praetorian-cli MCP connection...\n');

  try {
    console.log('Test: List assets (first page)');
    const result = await assetsList.execute({
      key_prefix: '',
      pages: 1
    });

    console.log('✅ Connection successful!');
    console.log(`   Total assets: ${result.summary.total_count}`);
    console.log(`   Returned: ${result.summary.returned_count}`);
    console.log(`   Profile: Using profile from keychain`);

    if (result.assets.length > 0) {
      console.log(`\n   First asset: ${result.assets[0].key}`);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Is praetorian-cli MCP server running?');
    console.error('   praetorian --profile demo chariot agent mcp start');
    console.error('2. Is demo profile configured in keychain?');
    console.error('   cat ~/.praetorian/keychain.ini');
  }
}

testConnection();
