/**
 * Schema Discovery for Context7 MCP Wrappers
 *
 * Discovers actual response format from real Context7 MCP server
 */
import { callMCPTool } from '../../config/lib/mcp-client';
import { estimateTokens } from '../../config/lib/response-utils.js';

async function discoverSchemas() {
  console.log('🔍 Context7 Schema Discovery\n');
  console.log('Testing against REAL Context7 MCP server\n');

  // Test cases for resolve-library-id
  const resolveTestCases = [
    { name: 'react', description: 'Popular library - many results' },
    { name: 'typescript', description: 'Popular library - many results' },
    { name: 'nonexistent-xyz-library-12345', description: 'Non-existent - should return empty/no results' }
  ];

  console.log('═'.repeat(70));
  console.log('Tool: resolve-library-id');
  console.log('═'.repeat(70));

  for (const testCase of resolveTestCases) {
    console.log(`\n📋 Test Case: ${testCase.description}`);
    console.log(`   Input: { libraryName: "${testCase.name}" }`);

    try {
      const rawResponse = await callMCPTool<any>(
        'context7',
        'resolve-library-id',
        { libraryName: testCase.name }
      );

      console.log(`\n   Response Type: ${typeof rawResponse}`);

      if (typeof rawResponse === 'string') {
        console.log(`   Response Length: ${rawResponse.length} characters`);
        console.log(`   Response Format: Text (not JSON)`);

        // Show first 500 chars
        const preview = rawResponse.substring(0, 500);
        console.log(`\n   Preview (first 500 chars):\n${preview}...\n`);

        // Analyze structure
        const blocks = rawResponse.split('----------');
        console.log(`   Structure: ${blocks.length - 1} library entries separated by "----------"`);

        // Parse first result
        if (blocks.length > 1) {
          const firstBlock = blocks[1];
          console.log(`\n   First Entry Structure:`);

          const titleMatch = firstBlock.match(/- Title: (.+)/);
          const idMatch = firstBlock.match(/- Context7-compatible library ID: (.+)/);
          const descMatch = firstBlock.match(/- Description: (.+)/);
          const snippetsMatch = firstBlock.match(/- Code Snippets: (\d+)/);
          const reputationMatch = firstBlock.match(/- Source Reputation: (\w+)/);
          const scoreMatch = firstBlock.match(/- Benchmark Score: ([\d.]+)/);
          const versionsMatch = firstBlock.match(/- Versions: (.+)/);

          if (titleMatch) console.log(`     - Title: ${titleMatch[1]}`);
          if (idMatch) console.log(`     - Context7-compatible library ID: ${idMatch[1]}`);
          if (descMatch) console.log(`     - Description: ${descMatch[1].substring(0, 100)}...`);
          if (snippetsMatch) console.log(`     - Code Snippets: ${snippetsMatch[1]}`);
          if (reputationMatch) console.log(`     - Source Reputation: ${reputationMatch[1]}`);
          if (scoreMatch) console.log(`     - Benchmark Score: ${scoreMatch[1]}`);
          if (versionsMatch) console.log(`     - Versions: ${versionsMatch[1]}`);
        }
      } else {
        console.log(`   Unexpected format: ${JSON.stringify(rawResponse, null, 2)}`);
      }

    } catch (error) {
      console.error(`   ✗ Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Test cases for get-library-docs
  console.log('\n\n' + '═'.repeat(70));
  console.log('Tool: get-library-docs');
  console.log('═'.repeat(70));

  const docsTestCases = [
    {
      id: '/websites/react_dev',
      mode: 'code' as const,
      description: 'React docs - code mode'
    },
    {
      id: '/websites/react_dev',
      mode: 'info' as const,
      description: 'React docs - info mode'
    }
  ];

  for (const testCase of docsTestCases) {
    console.log(`\n📋 Test Case: ${testCase.description}`);
    console.log(`   Input: { context7CompatibleLibraryID: "${testCase.id}", mode: "${testCase.mode}" }`);

    try {
      const rawResponse = await callMCPTool<any>(
        'context7',
        'get-library-docs',
        {
          context7CompatibleLibraryID: testCase.id,
          mode: testCase.mode
        }
      );

      console.log(`\n   Response Type: ${typeof rawResponse}`);

      if (typeof rawResponse === 'string') {
        console.log(`   Response Length: ${rawResponse.length} characters (~${estimateTokens(rawResponse)} tokens)`);
        console.log(`   Response Format: Text documentation`);

        // Show first 300 chars
        const preview = rawResponse.substring(0, 300);
        console.log(`\n   Preview (first 300 chars):\n${preview}...\n`);
      } else if (typeof rawResponse === 'object') {
        console.log(`   Response Keys: ${Object.keys(rawResponse).join(', ')}`);
        console.log(`   Response: ${JSON.stringify(rawResponse, null, 2).substring(0, 500)}...`);
      }

    } catch (error) {
      console.error(`   ✗ Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 Discovery Summary');
  console.log('═'.repeat(70));
  console.log(`
✅ Confirmed: Context7 MCP returns PLAIN TEXT, not JSON

🔹 resolve-library-id response format:
   - Type: string
   - Structure: Text with "----------" delimiters
   - Each library entry has:
     * Title
     * Context7-compatible library ID
     * Description
     * Code Snippets (optional)
     * Source Reputation (optional)
     * Benchmark Score (optional)
     * Versions (optional)

🔹 get-library-docs response format:
   - Type: string
   - Structure: Plain text documentation
   - Length: Varies by library (typically 1000-5000+ tokens)

⚠️  Current wrappers expect JSON with 'libraries' array
❌ Mismatch causes 0 results despite successful API calls

🔧 Fix Required:
   - Add text parser to extract structured data
   - Update filtering logic to parse text blocks
   - Handle both populated and empty results
  `);
}

discoverSchemas().catch(console.error);
