/**
 * Real API test for Context7 wrappers
 */
import { resolveLibraryId, getLibraryDocs } from './index';

async function test() {
  console.log('🧪 Testing Context7 with real API calls\n');

  const libraries = ['typescript', 'express', 'lodash', 'axios', 'vue'];

  for (const lib of libraries) {
    try {
      console.log(`\nSearching for: ${lib}`);
      const result = await resolveLibraryId.execute({ libraryName: lib });
      console.log(`  Results: ${result.totalResults}`);

      if (result.libraries.length > 0) {
        const firstLib = result.libraries[0];
        console.log(`  ✓ First: ${firstLib.name} (${firstLib.id})`);

        if (firstLib.description) {
          const preview = firstLib.description.substring(0, 100);
          console.log(`  Description: ${preview}...`);
        }

        // Try getting docs for first result
        console.log(`\n  Getting docs for ${firstLib.id}...`);
        const docs = await getLibraryDocs.execute({
          context7CompatibleLibraryID: firstLib.id,
          mode: 'code',
          page: 1
        });

        console.log(`  ✓ Got ${docs.estimatedTokens} tokens of documentation`);
        const docPreview = docs.documentation.substring(0, 200);
        console.log(`  Doc preview: ${docPreview}...`);

        console.log('\n✅ SUCCESS - Real API calls working!');
        break; // Exit after first success
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Error: ${message}`);
    }
  }
}

test().catch(console.error);
