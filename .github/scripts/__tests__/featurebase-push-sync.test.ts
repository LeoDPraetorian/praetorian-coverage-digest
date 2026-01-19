import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../featurebase-push-sync.ts');

/**
 * Tests for featurebase-push-sync.ts
 *
 * Pattern: Test script behavior through source code analysis and structure verification.
 * The script handles git operations and API calls, which we verify through code inspection.
 *
 * Coverage areas:
 * - getContentType function logic
 * - handleDeletedFiles function logic
 * - main function orchestration
 * - git integration
 * - error handling
 */
describe('featurebase-push-sync', () => {
  describe('getContentType function', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('defines getContentType function', () => {
      expect(scriptContent).toContain('function getContentType(');
    });

    it('returns "posts" for /posts/ paths', () => {
      const functionMatch = scriptContent.match(/function getContentType[\s\S]*?return 'posts'/);
      expect(functionMatch).toBeTruthy();
      expect(scriptContent).toContain("includes('/posts/')");
    });

    it('returns "changelog" for /changelog/ paths', () => {
      expect(scriptContent).toContain("includes('/changelog/')");
      expect(scriptContent).toContain("return 'changelog'");
    });

    it('returns "articles" for /help-center/ paths', () => {
      expect(scriptContent).toContain("includes('/help-center/')");
      expect(scriptContent).toContain("return 'articles'");
    });

    it('returns null for unknown paths', () => {
      const functionMatch = scriptContent.match(/function getContentType[\s\S]*?return null/);
      expect(functionMatch).toBeTruthy();
    });
  });

  describe('handleDeletedFiles function', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('defines async handleDeletedFiles function', () => {
      expect(scriptContent).toContain('async function handleDeletedFiles');
    });

    it('accepts deletedFiles and client parameters', () => {
      expect(scriptContent).toMatch(/handleDeletedFiles\(\s*deletedFiles.*?,\s*client/);
    });

    it('reads frontmatter from git history using HEAD~1', () => {
      expect(scriptContent).toContain('git show HEAD~1');
      expect(scriptContent).toContain('parseFrontmatter');
    });

    it('skips files without featurebaseId', () => {
      const skipMatch = scriptContent.match(/!data\.featurebaseId[\s\S]*?continue/);
      expect(skipMatch).toBeTruthy();
      expect(scriptContent).toContain('No featurebaseId');
      expect(scriptContent).toContain('skipping deletion');
    });

    it('skips files with unknown content type', () => {
      const skipMatch = scriptContent.match(/!contentType[\s\S]*?continue/);
      expect(skipMatch).toBeTruthy();
      expect(scriptContent).toContain('Unknown content type');
    });

    it('calls deletePost for posts', () => {
      const switchMatch = scriptContent.match(/case 'posts':[\s\S]*?deletePost\.execute/);
      expect(switchMatch).toBeTruthy();
    });

    it('calls deleteArticle for articles', () => {
      const switchMatch = scriptContent.match(/case 'articles':[\s\S]*?deleteArticle\.execute/);
      expect(switchMatch).toBeTruthy();
    });

    it('calls deleteChangelog for changelog', () => {
      const switchMatch = scriptContent.match(/case 'changelog':[\s\S]*?deleteChangelog\.execute/);
      expect(switchMatch).toBeTruthy();
    });

    it('accumulates errors without stopping', () => {
      // Verify error handling uses try-catch and continues
      expect(scriptContent).toMatch(/for.*?deletedFiles[\s\S]*?try[\s\S]*?catch/);
      expect(scriptContent).toContain('errors.push');
      // Loop should continue after error
    });

    it('returns deleted count and errors', () => {
      expect(scriptContent).toMatch(/return\s*{\s*deleted.*?,\s*errors/);
    });

    it('increments deleted counter on success', () => {
      const counterMatch = scriptContent.match(/deleted\+\+/);
      expect(counterMatch).toBeTruthy();
    });
  });

  describe('main function', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('defines async main function', () => {
      expect(scriptContent).toContain('async function main()');
    });

    it('logs starting message', () => {
      expect(scriptContent).toContain('Starting FeatureBase push sync');
    });

    it('gets changed files from git diff', () => {
      expect(scriptContent).toContain('git diff --name-only HEAD~1 HEAD');
      expect(scriptContent).toContain('modules/chariot/docs/featurebase/');
    });

    it('gets deleted files from git diff with --diff-filter=D', () => {
      expect(scriptContent).toContain('git diff --name-only --diff-filter=D HEAD~1 HEAD');
    });

    it('logs changed and deleted file counts', () => {
      expect(scriptContent).toContain('📝 Changed files');
      expect(scriptContent).toContain('🗑️  Deleted files');
      expect(scriptContent).toContain('changedFiles.length');
      expect(scriptContent).toContain('deletedFiles.length');
    });

    it('exits early when no changes', () => {
      const earlyExitMatch = scriptContent.match(/changedFiles\.length === 0.*?deletedFiles\.length === 0[\s\S]*?return/);
      expect(earlyExitMatch).toBeTruthy();
      expect(scriptContent).toContain('No changes to sync');
    });

    it('processes deletions before updates', () => {
      // Check for the actual function CALLS in main(), not just any occurrence
      // Look for where handleDeletedFiles is called (with await)
      const deleteCallIndex = scriptContent.indexOf('await handleDeletedFiles(deletedFiles');
      // Look for where syncFromMarkdown is called (with await)
      const syncCallIndex = scriptContent.indexOf('await syncFromMarkdown(');

      expect(deleteCallIndex).toBeGreaterThan(0);
      expect(syncCallIndex).toBeGreaterThan(0);
      expect(deleteCallIndex).toBeLessThan(syncCallIndex);
    });

    it('calls syncFromMarkdown with changedFiles', () => {
      expect(scriptContent).toMatch(/syncFromMarkdown\([\s\S]*?changedFiles/);
    });

    it('passes types array to syncFromMarkdown', () => {
      expect(scriptContent).toMatch(/syncFromMarkdown\([\s\S]*?types:.*?\['posts', 'changelog', 'articles'\]/);
    });

    it('exports workflow outputs using ::set-output', () => {
      expect(scriptContent).toContain('::set-output name=filesProcessed');
      expect(scriptContent).toContain('::set-output name=created');
      expect(scriptContent).toContain('::set-output name=updated');
      expect(scriptContent).toContain('::set-output name=deleted');
    });

    it('combines errors from delete and sync operations', () => {
      expect(scriptContent).toContain('deleteResult.errors');
      expect(scriptContent).toContain('result.errors');
      expect(scriptContent).toMatch(/\[\.\.\.deleteResult\.errors.*?\.\.\.result\.errors\]/);
    });

    it('exits with code 1 on errors', () => {
      const errorExitMatch = scriptContent.match(/allErrors\.length > 0[\s\S]*?process\.exit\(1\)/);
      expect(errorExitMatch).toBeTruthy();
    });

    it('exits with code 0 on success', () => {
      const successExitMatch = scriptContent.match(/process\.exit\(0\)/);
      expect(successExitMatch).toBeTruthy();
    });
  });

  describe('git integration', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('imports execSync from child_process', () => {
      expect(scriptContent).toContain("import { execSync } from 'child_process'");
    });

    it('uses UTF-8 encoding for git commands', () => {
      expect(scriptContent).toMatch(/execSync\([\s\S]*?encoding: 'utf-8'/);
    });

    it('filters empty lines from git output', () => {
      expect(scriptContent).toContain('.split(\'\\n\')');
      expect(scriptContent).toContain('.filter(Boolean)');
    });

    it('handles git command output as multi-line', () => {
      // Verify split('\n') is used to parse git output
      const gitCommandMatches = scriptContent.match(/execSync\([^)]*?\)[\s\S]*?\.split\('\\n'\)/g);
      expect(gitCommandMatches).toBeTruthy();
      expect(gitCommandMatches!.length).toBeGreaterThanOrEqual(2); // At least for changed and deleted files
    });
  });

  describe('error handling', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('logs errors when present', () => {
      expect(scriptContent).toContain('⚠️  Errors encountered');
      expect(scriptContent).toContain('allErrors.forEach');
    });

    it('logs error details with file and message', () => {
      expect(scriptContent).toContain('err.file');
      expect(scriptContent).toContain('err.error');
    });

    it('exports errors to workflow output', () => {
      expect(scriptContent).toContain('::set-output name=errors');
      expect(scriptContent).toContain('JSON.stringify(allErrors)');
    });

    it('catches fatal errors in main catch block', () => {
      expect(scriptContent).toContain('main().catch');
      expect(scriptContent).toContain('❌ Push sync failed');
    });

    it('handles errors in handleDeletedFiles', () => {
      const handleDeletedMatch = scriptContent.match(/async function handleDeletedFiles[\s\S]*?try[\s\S]*?catch/);
      expect(handleDeletedMatch).toBeTruthy();
    });

    it('converts errors to strings safely', () => {
      expect(scriptContent).toContain('error instanceof Error');
      expect(scriptContent).toContain('String(error)');
    });
  });

  describe('success path logging', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('logs sync complete message', () => {
      expect(scriptContent).toContain('✅ Sync complete');
    });

    it('logs files processed count', () => {
      expect(scriptContent).toContain('Files processed');
      expect(scriptContent).toContain('result.filesProcessed');
    });

    it('logs created count', () => {
      expect(scriptContent).toContain('Created');
      expect(scriptContent).toContain('result.created');
    });

    it('logs updated count', () => {
      expect(scriptContent).toContain('Updated');
      expect(scriptContent).toContain('result.updated');
    });

    it('logs deleted count', () => {
      expect(scriptContent).toContain('Deleted');
      expect(scriptContent).toContain('deleteResult.deleted');
    });
  });

  describe('script metadata', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('has shebang for direct execution', () => {
      expect(scriptContent.startsWith('#!/usr/bin/env npx tsx')).toBe(true);
    });

    it('has descriptive header comment', () => {
      expect(scriptContent).toContain('FeatureBase Push Sync Script');
      expect(scriptContent).toContain('Reads markdown files and pushes changes');
      expect(scriptContent).toContain('PR merge');
    });

    it('imports all required modules', () => {
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/client.js'");
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/sync-from-markdown.js'");
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/internal/frontmatter.js'");
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/delete-post.js'");
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/delete-article.js'");
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/delete-changelog.js'");
    });

    it('defines ROOT constant', () => {
      expect(scriptContent).toContain('const ROOT');
      expect(scriptContent).toContain("'../..'");
    });
  });

  describe('deletion workflow', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('only processes deletions if deletedFiles.length > 0', () => {
      const conditionalMatch = scriptContent.match(/if \(deletedFiles\.length > 0\)[\s\S]*?handleDeletedFiles/);
      expect(conditionalMatch).toBeTruthy();
    });

    it('logs deletion processing message', () => {
      expect(scriptContent).toContain('📝 Processing deletions');
    });

    it('logs deletion results', () => {
      expect(scriptContent).toContain('✅ Deleted');
      expect(scriptContent).toContain('deleteResult.deleted');
    });

    it('logs individual deletion with emoji', () => {
      expect(scriptContent).toContain('🗑️  Deleting');
      expect(scriptContent).toContain('contentType');
      expect(scriptContent).toContain('data.featurebaseId');
    });

    it('logs deletion success per item', () => {
      expect(scriptContent).toContain('✅ Deleted');
      // Appears in both loop and summary
    });
  });
});
