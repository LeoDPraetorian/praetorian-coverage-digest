#!/usr/bin/env tsx
/**
 * Automated script to convert all wrappers from mock to real MCP calls
 *
 * Converts:
 * 1. Add import: import { callMCPTool } from './lib/mcp-client.js';
 * 2. Replace mock call with: callMCPTool('tool_name', validated)
 * 3. Add defensive response parsing
 * 4. Remove mock functions
 *
 * Usage: npx tsx .claude/tools/praetorian-cli/update-all-wrappers.ts
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';

const TOOLS_DIR = '.claude/tools/praetorian-cli';

// Map of wrapper filenames to MCP tool names
const TOOL_MAPPINGS: Record<string, string> = {
  'aegis-list.ts': 'aegis_list',
  'assets-get.ts': 'assets_get',
  'assets-list.ts': 'assets_list',
  'attributes-get.ts': 'attributes_get',
  'attributes-list.ts': 'attributes_list',
  'capabilities-list.ts': 'capabilities_list',
  'integrations-list.ts': 'integrations_list',
  'jobs-get.ts': 'jobs_get',
  'jobs-list.ts': 'jobs_list',
  'keys-list.ts': 'keys_list',
  'preseeds-list.ts': 'preseeds_list',
  'risks-get.ts': 'risks_get',
  'risks-list.ts': 'risks_list',
  'search-by-query.ts': 'search_by_query',
  'seeds-list.ts': 'seeds_list'
};

async function updateWrapper(filename: string, toolName: string): Promise<boolean> {
  const filepath = join(TOOLS_DIR, filename);

  try {
    let content = await readFile(filepath, 'utf-8');

    // Skip if already updated (has callMCPTool import)
    if (content.includes("from './lib/mcp-client.js'")) {
      console.log(`  ⏭️  ${filename} - Already updated, skipping`);
      return true;
    }

    console.log(`  🔄 ${filename} - Updating...`);

    // Step 1: Add import statement
    if (!content.includes('import { callMCPTool }')) {
      content = content.replace(
        /import { z } from 'zod';/,
        "import { z } from 'zod';\nimport { callMCPTool } from './lib/mcp-client.js';"
      );
    }

    // Step 2: Replace mock call with real MCP call
    // Pattern: const rawResult = await mockXxxCall(validated);
    const mockCallPattern = /const rawResult = await mock\w+Call\(validated\);/;
    if (mockCallPattern.test(content)) {
      content = content.replace(
        mockCallPattern,
        `const rawResult = await callMCPTool('${toolName}', validated);`
      );
    } else {
      // Alternative pattern: await mockXxxCall(...)
      content = content.replace(
        /await mock\w+Call\(/g,
        `await callMCPTool('${toolName}', `
      );
    }

    // Step 3: Comment out or remove mock functions (don't delete for safety)
    // Pattern: async function mockXxxCall(...) { ... }
    content = content.replace(
      /(\/\*\*[\s\S]*?\*\/\s*)?async function mock\w+Call\([^)]*\)[\s\S]*?(?=\/\/|$|\/\*\*|export|async function)/g,
      (match) => {
        if (match.trim()) {
          return `// REMOVED: Mock function - now using real MCP server\n// ${match.split('\n').join('\n// ')}\n\n`;
        }
        return '';
      }
    );

    // Write updated content
    await writeFile(filepath, content, 'utf-8');
    console.log(`  ✅ ${filename} - Updated successfully`);
    return true;

  } catch (error) {
    console.error(`  ❌ ${filename} - Error:`, error);
    return false;
  }
}

async function main() {
  console.log('Converting all wrappers to use real MCP server...\n');
  console.log(`Target: ${Object.keys(TOOL_MAPPINGS).length} wrappers\n`);

  const results: Array<{ file: string; success: boolean }> = [];

  for (const [filename, toolName] of Object.entries(TOOL_MAPPINGS)) {
    const success = await updateWrapper(filename, toolName);
    results.push({ file: filename, success });
  }

  console.log('\n' + '='.repeat(80));
  console.log('Summary:');
  console.log(`  ✅ Successfully updated: ${results.filter(r => r.success).length}`);
  console.log(`  ❌ Failed: ${results.filter(r => !r.success).length}`);
  console.log('='.repeat(80));

  if (results.some(r => !r.success)) {
    console.log('\nFailed files:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.file}`);
    });
    process.exit(1);
  }

  console.log('\n✓ All wrappers successfully converted to use real MCP server');
  console.log('\nNext steps:');
  console.log('  1. Test wrappers with: npx tsx .claude/tools/praetorian-cli/test-assets-list.ts');
  console.log('  2. Configure authentication: praetorian configure');
  console.log('  3. Update .mcp.json profile if needed');
}

main();
