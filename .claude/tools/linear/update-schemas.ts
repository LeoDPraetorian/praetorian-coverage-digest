#!/usr/bin/env tsx

/**
 * Script to update Linear wrapper schemas with estimatedTokens field
 * This adds 'estimatedTokens: z.number()' to all output schemas
 */

import * as fs from 'fs';
import * as path from 'path';

const LINEAR_DIR = '/Users/nathansportsman/chariot-development-platform2/.claude/tools/linear';

const FILES_TO_UPDATE = [
  'create-bug.ts',
  'create-comment.ts',
  'create-jira-bug.ts',
  'create-project.ts',
  'find-issue.ts',
  'find-user.ts',
  'get-project.ts',
  'get-team.ts',
  'list-comments.ts',
  'list-teams.ts',
  'list-users.ts',
  'update-cycle.ts',
  'update-project.ts',
  'list-projects.ts',
  'list-cycles.ts',
];

function updateSchema(content: string): string {
  // Pattern 1: Find output schema definitions
  // Match: export const XxxOutput = z.object({ ... });
  const schemaPattern = /(export const \w+Output = z\.object\(\{[\s\S]*?\n\}\);)/g;

  return content.replace(schemaPattern, (match) => {
    // Check if estimatedTokens already exists
    if (match.includes('estimatedTokens')) {
      console.log('    Already has estimatedTokens, skipping');
      return match;
    }

    // Add estimatedTokens before the closing });
    return match.replace(/\n\}\);$/, ',\n  estimatedTokens: z.number()\n});');
  });
}

function updateExecuteFunction(content: string): string {
  // Find the execute function and update the filtered object construction
  // Pattern: const filtered = { ... };

  // This is complex because we need to:
  // 1. Find where filtered is created
  // 2. Extract the object
  // 3. Create baseData from it
  // 4. Add estimatedTokens calculation

  // For now, let's just mark files that need manual update
  if (content.includes('const filtered = {') && !content.includes('const baseData = {')) {
    console.log('    ⚠️  Needs manual execute() function update');
  }

  return content;
}

async function main() {
  console.log(`Updating ${FILES_TO_UPDATE.length} Linear wrapper files...\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const file of FILES_TO_UPDATE) {
    const filePath = path.join(LINEAR_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file}: Not found, skipping`);
      skippedCount++;
      continue;
    }

    console.log(`📝 ${file}:`);

    const content = fs.readFileSync(filePath, 'utf-8');
    let updated = updateSchema(content);
    updated = updateExecuteFunction(updated);

    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf-8');
      console.log('    ✅ Schema updated');
      updatedCount++;
    } else {
      console.log('    ⏭️  No schema changes needed');
      skippedCount++;
    }
  }

  console.log(`\n✅ Complete: ${updatedCount} updated, ${skippedCount} skipped`);
  console.log('\n⚠️  Manual steps still needed:');
  console.log('  - Update execute() functions to calculate estimatedTokens');
  console.log('  - Run TypeScript compiler');
  console.log('  - Run tests');
}

main().catch(console.error);
