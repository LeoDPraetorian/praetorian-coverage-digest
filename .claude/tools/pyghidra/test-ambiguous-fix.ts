import { createPyghidraHTTPClient } from './lib/pyghidra-http-client.js';

const client = createPyghidraHTTPClient({ port: 8765 });

async function test() {
  console.log('Testing ambiguous match handling...\n');
  
  // This should trigger "Ambiguous match" error from server
  try {
    const result = await client.callTool({
      name: 'list_cross_references',
      arguments: {
        binary_name: '/framework-service-34560e',
        name_or_address: '0082e394',  // Address with ambiguous symbols
      },
    });
    
    console.log('✓ Got result:', result);
  } catch (error: any) {
    console.log('✗ Error:', error.message);
    console.log('\nError includes "Ambiguous"?', error.message.includes('Ambiguous'));
  }
}

test();
