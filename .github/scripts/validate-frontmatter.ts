#!/usr/bin/env npx tsx

/**
 * Validate YAML frontmatter in markdown files
 *
 * Ensures all changed files have valid frontmatter before syncing to FeatureBase.
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';
import { parseFrontmatter } from '../../.claude/tools/featurebase/internal/frontmatter.js';
import { z } from 'zod';

// Required frontmatter schema
const frontmatterSchema = z.object({
  title: z.string().min(1, 'title is required'),
  featurebaseId: z.string().optional(),
  boardId: z.string().min(1, 'boardId is required for posts'),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

async function main() {
  // Get changed markdown files
  const changedFiles = execSync(
    'git diff --name-only HEAD~1 HEAD -- modules/chariot/docs/featurebase/**/*.md',
    { encoding: 'utf-8' }
  )
    .split('\n')
    .filter(Boolean);

  console.log(`Validating ${changedFiles.length} files...`);

  const errors: Array<{ file: string; error: string }> = [];

  for (const file of changedFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const { data } = parseFrontmatter(content);

      // Validate frontmatter
      frontmatterSchema.parse(data);

      console.log(`✅ ${file}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${file}: ${message}`);
      errors.push({ file, error: message });
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ Validation failed');
    console.error('Please fix the above errors and re-commit.');
    process.exit(1);
  }

  console.log('\n✅ All files valid');
  process.exit(0);
}

main().catch((error) => {
  console.error('Validation script error:', error);
  process.exit(1);
});
