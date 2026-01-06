#!/usr/bin/env tsx

/**
 * Script to update execute() functions in Linear wrappers
 * Adds estimatedTokens calculation to filtered responses
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

function updateExecuteFunction(content: string): { updated: string; changed: boolean } {
  let changed = false;

  // Skip if already has baseData pattern (already updated)
  if (content.includes('const baseData = {') && content.includes('estimatedTokens: estimateTokens(')) {
    return { updated: content, changed: false };
  }

  // Pattern 1: Simple object construction (create, update, etc.)
  // Find: const filtered = { success: true, issue: { ... } };
  // Replace with: const baseData = { ... }; const filtered = { ...baseData, estimatedTokens: estimateTokens(baseData) };

  const pattern1 = /(\n\s+)(\/\/ Filter to essential fields\n\s+)(const filtered = \{[\s\S]*?\n\s+\};)/g;

  let updated = content.replace(pattern1, (match, indent, comment, filteredBlock) => {
    // Extract the object content
    const objectContent = filteredBlock.replace(/const filtered = /, 'const baseData = ');

    const replacement =
      `${indent}${comment}` +
      `${objectContent}\n\n` +
      `${indent}const filtered = {\n` +
      `${indent}  ...baseData,\n` +
      `${indent}  estimatedTokens: estimateTokens(baseData)\n` +
      `${indent}};`;

    changed = true;
    return replacement;
  });

  // Pattern 2: Array/list responses
  // Find: const filtered = { issues: issues.map(...), ... };
  // Need to extract the array construction first

  if (!changed) {
    // Try alternative pattern for list endpoints
    const pattern2 = /(\n\s+)(const filtered = \{\n\s+(\w+): .*?\.map\([\s\S]*?\}\),[\s\S]*?\n\s+\};)/g;

    updated = content.replace(pattern2, (match, indent, filteredBlock, arrayName) => {
      // Check if this is a list pattern
      if (filteredBlock.includes(`.map(`)) {
        // Extract the mapped array creation
        const transformPattern = new RegExp(`const ${arrayName} = .*?\\.map\\([\\s\\S]*?\\}\\);`, 'g');
        const hasTransform = content.match(transformPattern);

        if (hasTransform) {
          // Array is already extracted, just add token estimation
          const newFiltered = filteredBlock.replace(
            /\};$/,
            `,\n${indent}  estimatedTokens: estimateTokens(${arrayName})\n${indent}};`
          );
          changed = true;
          return `${indent}${newFiltered}`;
        }
      }
      return match;
    });
  }

  return { updated, changed };
}

async function main() {
  console.log(`Updating execute() functions in ${FILES_TO_UPDATE.length} files...\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const file of FILES_TO_UPDATE) {
    const filePath = path.join(LINEAR_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file}: Not found`);
      skippedCount++;
      continue;
    }

    console.log(`📝 ${file}:`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const { updated, changed } = updateExecuteFunction(content);

    if (changed) {
      fs.writeFileSync(filePath, updated, 'utf-8');
      console.log('    ✅ Execute function updated');
      updatedCount++;
    } else {
      console.log('    ⏭️  No changes or already updated');
      skippedCount++;
    }
  }

  console.log(`\n✅ Complete: ${updatedCount} updated, ${skippedCount} skipped/already done`);
}

main().catch(console.error);
