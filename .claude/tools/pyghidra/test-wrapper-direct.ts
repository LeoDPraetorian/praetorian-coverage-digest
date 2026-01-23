#!/usr/bin/env tsx
import { listCrossReferences } from './list-cross-references.js';

async function test() {
  console.log('Testing list-cross-references wrapper...\n');
  
  // Test with strcpy address (known to cause ambiguous match)
  console.log('Test 1: strcpy at 0082e394 (should trigger ambiguous match)');
  try {
    const result = await listCrossReferences.execute({
      binary_name: '/framework-service-34560e',
      name_or_address: '0082e394',
      filter_type: 'CALL',
      limit: 10,
      offset: 0,
    });
    
    console.log('✓ Success!');
    console.log('  Cross-references found:', result.cross_references.length);
    console.log('  Sample:', JSON.stringify(result.cross_references[0], null, 2));
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }
}

test();
