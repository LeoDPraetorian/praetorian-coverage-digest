import { callMCPTool } from '../config/lib/mcp-client.js';

async function test() {
  console.log('Testing callMCPTool with ambiguous address...\n');
  
  try {
    const result = await callMCPTool('pyghidra', 'list_cross_references', {
      binary_name: '/framework-service-34560e',
      name_or_address: '0082e394',  // Ambiguous strcpy address
    }, { timeoutMs: 30000 });
    
    console.log('✓ callMCPTool returned (no exception)');
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result || {}));
    console.log('Has cross_references?', !!(result as any)?.cross_references);
    console.log('Full result:', JSON.stringify(result, null, 2).substring(0, 500));
  } catch (error: any) {
    console.log('✗ callMCPTool threw exception');
    console.log('Error message:', error.message);
  }
}

test();
