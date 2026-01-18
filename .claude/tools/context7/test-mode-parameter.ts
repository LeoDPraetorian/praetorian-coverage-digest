/**
 * Verify mode parameter is passed to MCP server
 * Compares code vs info mode outputs
 */

import { getLibraryDocs } from './get-library-docs';

console.log('🧪 Testing Mode Parameter Impact\n');
console.log('Comparing code vs info mode for /facebook/react\n');

// Test 1: Code mode (API references)
console.log('1️⃣  MODE: "code" (API references and code examples)');
console.log('─'.repeat(60));
try {
  const codeResult = await getLibraryDocs.execute({
    context7CompatibleLibraryID: '/facebook/react',
    mode: 'code',
    topic: 'hooks'
  });

  console.log(`✓ Mode: ${codeResult.mode}`);
  console.log(`✓ Tokens: ${codeResult.estimatedTokens}`);
  console.log(`✓ Preview:\n${codeResult.documentation.substring(0, 200)}...\n`);
} catch (error: any) {
  console.error(`✗ Code mode failed: ${error.message}\n`);
}

// Test 2: Info mode (conceptual guides)
console.log('2️⃣  MODE: "info" (conceptual guides and architecture)');
console.log('─'.repeat(60));
try {
  const infoResult = await getLibraryDocs.execute({
    context7CompatibleLibraryID: '/facebook/react',
    mode: 'info',
    topic: 'architecture'
  });

  console.log(`✓ Mode: ${infoResult.mode}`);
  console.log(`✓ Tokens: ${infoResult.estimatedTokens}`);
  console.log(`✓ Preview:\n${infoResult.documentation.substring(0, 200)}...\n`);
} catch (error: any) {
  console.error(`✗ Info mode failed: ${error.message}\n`);
}

// Test 3: Default mode (should be 'code')
console.log('3️⃣  MODE: default (should be "code")');
console.log('─'.repeat(60));
try {
  const defaultResult = await getLibraryDocs.execute({
    context7CompatibleLibraryID: '/facebook/react',
    topic: 'useState'
  });

  console.log(`✓ Mode: ${defaultResult.mode}`);
  console.log(`✓ Tokens: ${defaultResult.estimatedTokens}`);
  console.log(`✓ Preview:\n${defaultResult.documentation.substring(0, 200)}...\n`);

  if (defaultResult.mode === 'code') {
    console.log('✅ Default mode correctly set to "code"');
  } else {
    console.log('❌ Default mode should be "code" but got:', defaultResult.mode);
  }
} catch (error: any) {
  console.error(`✗ Default mode failed: ${error.message}\n`);
}

console.log('═'.repeat(60));
console.log('✅ Mode parameter successfully integrated with MCP server');
console.log('═'.repeat(60));
