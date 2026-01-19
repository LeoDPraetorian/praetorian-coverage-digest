#!/usr/bin/env npx tsx

/**
 * FeatureBase Push Sync Script
 *
 * Reads markdown files and pushes changes to FeatureBase API.
 * Called by GitHub Actions on PR merge.
 */

import { createFeaturebaseClient } from '../../.claude/tools/featurebase/client.js';
import { syncFromMarkdown } from '../../.claude/tools/featurebase/sync-from-markdown.js';
import { parseFrontmatter } from '../../.claude/tools/featurebase/internal/frontmatter.js';
import { deletePost } from '../../.claude/tools/featurebase/delete-post.js';
import { deleteArticle } from '../../.claude/tools/featurebase/delete-article.js';
import { deleteChangelog } from '../../.claude/tools/featurebase/delete-changelog.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

/**
 * Determine content type from file path
 */
function getContentType(filePath: string): 'posts' | 'changelog' | 'articles' | null {
  if (filePath.includes('/posts/')) return 'posts';
  if (filePath.includes('/changelog/')) return 'changelog';
  if (filePath.includes('/help-center/')) return 'articles';
  return null;
}

/**
 * Handle deleted files by calling appropriate delete API
 */
async function handleDeletedFiles(
  deletedFiles: string[],
  client: ReturnType<typeof createFeaturebaseClient>
): Promise<{ deleted: number; errors: Array<{ file: string; error: string }> }> {
  let deleted = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of deletedFiles) {
    try {
      // Read file content from git history
      const content = execSync(`git show HEAD~1:${file}`, { encoding: 'utf-8' });
      const { data } = parseFrontmatter(content);

      if (!data.featurebaseId) {
        console.warn(`⚠️  No featurebaseId in ${file}, skipping deletion`);
        continue;
      }

      const contentType = getContentType(file);
      if (!contentType) {
        console.warn(`⚠️  Unknown content type for ${file}, skipping deletion`);
        continue;
      }

      console.log(`🗑️  Deleting ${contentType}: ${data.featurebaseId}`);

      // Call appropriate delete API
      switch (contentType) {
        case 'posts':
          await deletePost.execute({ postId: data.featurebaseId }, client);
          break;
        case 'articles':
          await deleteArticle.execute({ articleId: data.featurebaseId }, client);
          break;
        case 'changelog':
          await deleteChangelog.execute({ changelogId: data.featurebaseId }, client);
          break;
      }

      deleted++;
      console.log(`   ✅ Deleted ${contentType}: ${data.featurebaseId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed to delete ${file}: ${message}`);
      errors.push({ file, error: message });
    }
  }

  return { deleted, errors };
}

async function main() {
  console.log('Starting FeatureBase push sync...');

  // Get changed files from git
  const changedFiles = execSync(
    'git diff --name-only HEAD~1 HEAD -- modules/chariot/docs/featurebase/',
    { encoding: 'utf-8' }
  )
    .split('\n')
    .filter(Boolean);

  console.log(`📝 Changed files: ${changedFiles.length}`);
  changedFiles.forEach((file) => console.log(`  - ${file}`));

  // Get deleted files from git
  const deletedFiles = execSync(
    'git diff --name-only --diff-filter=D HEAD~1 HEAD -- modules/chariot/docs/featurebase/',
    { encoding: 'utf-8' }
  )
    .split('\n')
    .filter(Boolean);

  console.log(`🗑️  Deleted files: ${deletedFiles.length}`);
  deletedFiles.forEach((file) => console.log(`  - ${file}`));

  if (changedFiles.length === 0 && deletedFiles.length === 0) {
    console.log('✅ No changes to sync');
    return;
  }

  // Create client
  const client = createFeaturebaseClient();

  // Handle deleted files first
  let deleteResult = { deleted: 0, errors: [] as Array<{ file: string; error: string }> };
  if (deletedFiles.length > 0) {
    console.log('\n📝 Processing deletions...');
    deleteResult = await handleDeletedFiles(deletedFiles, client);
    console.log(`✅ Deleted: ${deleteResult.deleted}`);
  }

  // Sync changed content
  const result = await syncFromMarkdown(
    {
      inputDir: path.join(ROOT, 'modules/chariot/docs/featurebase'),
      types: ['posts', 'changelog', 'articles'],
      changedFiles, // Only sync changed files
    },
    client
  );

  console.log('✅ Sync complete:');
  console.log(`  - Files processed: ${result.filesProcessed}`);
  console.log(`  - Created: ${result.created}`);
  console.log(`  - Updated: ${result.updated}`);
  console.log(`  - Deleted: ${deleteResult.deleted}`);

  // Combine errors from both operations
  const allErrors = [...deleteResult.errors, ...result.errors];

  if (allErrors.length > 0) {
    console.error('⚠️  Errors encountered:');
    allErrors.forEach((err) => {
      console.error(`  - ${err.file}: ${err.error}`);
    });

    // Export for workflow
    console.log(`::set-output name=errors::${JSON.stringify(allErrors)}`);
    process.exit(1);
  }

  // Export results for workflow
  console.log(`::set-output name=filesProcessed::${result.filesProcessed}`);
  console.log(`::set-output name=created::${result.created}`);
  console.log(`::set-output name=updated::${result.updated}`);
  console.log(`::set-output name=deleted::${deleteResult.deleted}`);

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Push sync failed:', error);
  process.exit(1);
});
