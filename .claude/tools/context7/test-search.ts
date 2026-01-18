/**
 * Test context7 search functionality
 */

import { resolveLibraryId } from './resolve-library-id';

console.log('🔍 Testing context7 search...\n');

const searchTerms = [
  'react',
  'next',
  'nextjs',
  'express',
  'mongodb',
  'supabase',
  'vercel'
];

for (const term of searchTerms) {
  try {
    console.log(`Searching for: "${term}"`);
    const result = await resolveLibraryId.execute({ libraryName: term });

    if (result.totalResults > 0) {
      console.log(`  ✓ Found ${result.totalResults} results`);
      result.libraries.slice(0, 3).forEach((lib: any) => {
        console.log(`    - ${lib.id}: ${lib.name}`);
        if (lib.description) {
          console.log(`      ${lib.description.substring(0, 60)}...`);
        }
      });
    } else {
      console.log(`  ✗ No results found`);
    }
    console.log('');
  } catch (error: any) {
    console.error(`  ✗ Error: ${error.message}\n`);
  }
}
