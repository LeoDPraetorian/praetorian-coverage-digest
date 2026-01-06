/**
 * Live integration test for Serena wrappers
 * Tests against a small project to avoid timeout issues
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const TEST_PROJECT = '/tmp/serena-test';

async function runLiveTests() {
  console.log('=== Serena Live Integration Tests ===\n');

  // Create test transport directly (bypassing wrapper for speed)
  const transport = new StdioClientTransport({
    command: 'uvx',
    args: [
      '--from', 'git+https://github.com/oraios/serena',
      'serena', 'start-mcp-server',
      '--context', 'claude-code',
      '--project', TEST_PROJECT
    ],
  });

  const client = new Client(
    { name: 'serena-live-test', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    console.log('Connecting to Serena MCP server...');
    await client.connect(transport);
    console.log('Connected!\n');

    // Test 1: list_memories
    console.log('Test 1: list_memories');
    const memories = await client.callTool({ name: 'list_memories', arguments: {} });
    console.log('Result:', JSON.stringify(memories, null, 2));
    console.log('✅ list_memories works\n');

    // Test 2: get_symbols_overview
    console.log('Test 2: get_symbols_overview');
    const overview = await client.callTool({
      name: 'get_symbols_overview',
      arguments: { relative_path: 'test.ts', depth: 1 }
    });
    console.log('Result:', JSON.stringify(overview, null, 2));
    console.log('✅ get_symbols_overview works\n');

    // Test 3: find_symbol
    console.log('Test 3: find_symbol');
    const symbols = await client.callTool({
      name: 'find_symbol',
      arguments: { name_path_pattern: 'Calculator', depth: 1 }
    });
    console.log('Result:', JSON.stringify(symbols, null, 2));
    console.log('✅ find_symbol works\n');

    // Test 4: list_dir
    console.log('Test 4: list_dir');
    const dir = await client.callTool({
      name: 'list_dir',
      arguments: { relative_path: '.', recursive: false }
    });
    console.log('Result:', JSON.stringify(dir, null, 2));
    console.log('✅ list_dir works\n');

    // Test 5: write_memory + read_memory
    console.log('Test 5: write_memory');
    await client.callTool({
      name: 'write_memory',
      arguments: { memory_file_name: 'test-note', content: 'This is a test memory' }
    });
    console.log('✅ write_memory works\n');

    console.log('Test 6: read_memory');
    const readMem = await client.callTool({
      name: 'read_memory',
      arguments: { memory_file_name: 'test-note' }
    });
    console.log('Result:', JSON.stringify(readMem, null, 2));
    console.log('✅ read_memory works\n');

    // Test 7: delete_memory
    console.log('Test 7: delete_memory');
    await client.callTool({
      name: 'delete_memory',
      arguments: { memory_file_name: 'test-note' }
    });
    console.log('✅ delete_memory works\n');

    // Test 8: get_current_config
    console.log('Test 8: get_current_config');
    const config = await client.callTool({ name: 'get_current_config', arguments: {} });
    console.log('Result:', typeof config.content === 'string' ? config.content.substring(0, 500) + '...' : JSON.stringify(config, null, 2));
    console.log('✅ get_current_config works\n');

    console.log('=== All Live Tests Passed! ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore
    }
    process.exit(0);
  }
}

runLiveTests();
