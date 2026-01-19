#!/usr/bin/env npx tsx

/**
 * FeatureBase Pull Sync Script
 *
 * Fetches content from FeatureBase API and writes to markdown files.
 * Called by GitHub Actions workflow.
 */

import { createFeaturebaseClient } from '../../.claude/tools/featurebase/client.js';
import { syncToMarkdown } from '../../.claude/tools/featurebase/sync-to-markdown.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

async function main() {
  console.log('Starting FeatureBase pull sync...');

  // Create client (uses FEATUREBASE_API_KEY env var)
  const client = createFeaturebaseClient();

  // Sync all content types
  const result = await syncToMarkdown(
    {
      outputDir: path.join(ROOT, 'modules/chariot/docs/featurebase'),
      types: ['posts', 'changelog', 'articles'],
      limit: 100,
    },
    client
  );

  console.log(`✅ Synced ${result.filesWritten} files from FeatureBase`);

  if (result.errors && result.errors.length > 0) {
    console.error('⚠️  Errors encountered:');
    result.errors.forEach((err) => {
      console.error(`  - ${err.type}/${err.id}: ${err.error}`);
    });
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
