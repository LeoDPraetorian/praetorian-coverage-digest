/**
 * Test our actual wrappers against live Serena MCP
 */

// Need to patch the MCP config to use a smaller project
process.env.SERENA_PROJECT = '/tmp/serena-test';

import { findSymbol } from './find-symbol.js';
import { getSymbolsOverview } from './get-symbols-overview.js';
import { listDir } from './list-dir.js';
import { listMemories } from './list-memories.js';
import { writeMemory } from './write-memory.js';
import { readMemory } from './read-memory.js';
import { deleteMemory } from './delete-memory.js';

async function testWrappers() {
  console.log('=== Wrapper Live Integration Tests ===\n');

  try {
    // Test 1: listMemories
    console.log('Test 1: listMemories wrapper');
    const memories = await listMemories.execute({});
    console.log('Result:', JSON.stringify(memories, null, 2));
    console.log('✅ listMemories wrapper works\n');

    // Test 2: getSymbolsOverview
    console.log('Test 2: getSymbolsOverview wrapper');
    const overview = await getSymbolsOverview.execute({
      relative_path: 'test.ts',
      depth: 1
    });
    console.log('Result:', JSON.stringify(overview, null, 2));
    console.log('✅ getSymbolsOverview wrapper works\n');

    // Test 3: findSymbol
    console.log('Test 3: findSymbol wrapper');
    const symbols = await findSymbol.execute({
      name_path_pattern: 'Calculator',
      depth: 1
    });
    console.log('Result:', JSON.stringify(symbols, null, 2));
    console.log('✅ findSymbol wrapper works\n');

    // Test 4: listDir
    console.log('Test 4: listDir wrapper');
    const dir = await listDir.execute({
      relative_path: '.',
      recursive: false
    });
    console.log('Result:', JSON.stringify(dir, null, 2));
    console.log('✅ listDir wrapper works\n');

    // Test 5: writeMemory
    console.log('Test 5: writeMemory wrapper');
    const writeResult = await writeMemory.execute({
      memory_file_name: 'wrapper-test',
      content: 'Testing from wrapper'
    });
    console.log('Result:', JSON.stringify(writeResult, null, 2));
    console.log('✅ writeMemory wrapper works\n');

    // Test 6: readMemory
    console.log('Test 6: readMemory wrapper');
    const readResult = await readMemory.execute({
      memory_file_name: 'wrapper-test'
    });
    console.log('Result:', JSON.stringify(readResult, null, 2));
    console.log('✅ readMemory wrapper works\n');

    // Test 7: deleteMemory
    console.log('Test 7: deleteMemory wrapper');
    const deleteResult = await deleteMemory.execute({
      memory_file_name: 'wrapper-test'
    });
    console.log('Result:', JSON.stringify(deleteResult, null, 2));
    console.log('✅ deleteMemory wrapper works\n');

    console.log('=== All Wrapper Live Tests Passed! ===');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testWrappers();
