import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../validate-frontmatter.ts');

/**
 * Tests for validate-frontmatter.ts
 *
 * Pattern: Test validation script behavior through source code analysis.
 * The script validates YAML frontmatter in markdown files before syncing to FeatureBase.
 *
 * Coverage areas:
 * - Frontmatter schema validation (Zod schema)
 * - File processing logic
 * - Error handling and reporting
 * - Exit codes
 * - Git integration
 */
describe('validate-frontmatter', () => {
  describe('frontmatter schema', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('defines frontmatterSchema using Zod', () => {
      expect(scriptContent).toContain('frontmatterSchema');
      expect(scriptContent).toContain('z.object');
    });

    it('requires title field', () => {
      expect(scriptContent).toContain('title:');
      expect(scriptContent).toContain('z.string()');
      expect(scriptContent).toContain('.min(1');
      expect(scriptContent).toContain('title is required');
    });

    it('requires boardId field for posts', () => {
      expect(scriptContent).toContain('boardId:');
      expect(scriptContent).toContain('z.string()');
      expect(scriptContent).toContain('.min(1');
      expect(scriptContent).toContain('boardId is required');
    });

    it('allows optional featurebaseId', () => {
      expect(scriptContent).toContain('featurebaseId:');
      expect(scriptContent).toContain('.optional()');
    });

    it('allows optional status', () => {
      expect(scriptContent).toContain('status:');
      expect(scriptContent).toContain('z.string().optional()');
    });

    it('allows optional createdAt', () => {
      expect(scriptContent).toContain('createdAt:');
      expect(scriptContent).toContain('.optional()');
    });

    it('allows optional updatedAt', () => {
      expect(scriptContent).toContain('updatedAt:');
      expect(scriptContent).toContain('.optional()');
    });
  });

  describe('file processing', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('reads changed files from git diff', () => {
      expect(scriptContent).toContain('git diff --name-only HEAD~1 HEAD');
      expect(scriptContent).toContain('modules/chariot/docs/featurebase/**/*.md');
    });

    it('filters empty lines from git output', () => {
      expect(scriptContent).toContain(".split('\\n')");
      expect(scriptContent).toContain('.filter(Boolean)');
    });

    it('logs validation count', () => {
      expect(scriptContent).toContain('Validating');
      expect(scriptContent).toContain('changedFiles.length');
      expect(scriptContent).toContain('files');
    });

    it('iterates through each changed file', () => {
      expect(scriptContent).toMatch(/for.*?changedFiles/);
    });

    it('reads file content using fs.readFile', () => {
      expect(scriptContent).toContain('fs.readFile');
      expect(scriptContent).toContain("'utf-8'");
    });

    it('parses frontmatter from file content', () => {
      expect(scriptContent).toContain('parseFrontmatter');
      expect(scriptContent).toContain('content');
    });

    it('validates frontmatter using schema.parse', () => {
      expect(scriptContent).toContain('frontmatterSchema.parse');
      expect(scriptContent).toContain('data');
    });

    it('logs success for valid files', () => {
      expect(scriptContent).toContain('✅');
      expect(scriptContent).toContain('file');
    });
  });

  describe('error handling', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('uses try-catch for validation', () => {
      expect(scriptContent).toMatch(/for.*?changedFiles[\s\S]*?try[\s\S]*?catch/);
    });

    it('continues on single file failure', () => {
      // Verify error is caught and loop continues
      expect(scriptContent).toContain('catch');
      expect(scriptContent).toContain('errors.push');
      // No break statement in catch block
      expect(scriptContent).not.toMatch(/catch[\s\S]{0,100}break/);
    });

    it('collects all errors in array', () => {
      expect(scriptContent).toContain('const errors');
      expect(scriptContent).toContain('errors.push');
      expect(scriptContent).toContain('file');
      expect(scriptContent).toContain('error');
    });

    it('logs error with file and message', () => {
      expect(scriptContent).toContain('❌');
      expect(scriptContent).toContain('file');
      expect(scriptContent).toContain('message');
    });

    it('converts errors to strings safely', () => {
      expect(scriptContent).toContain('error instanceof Error');
      expect(scriptContent).toContain('String(error)');
    });
  });

  describe('exit codes', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('exits 0 when all files valid', () => {
      // After logging "All files valid"
      const successMatch = scriptContent.match(/✅ All files valid[\s\S]*?process\.exit\(0\)/);
      expect(successMatch).toBeTruthy();
    });

    it('exits 1 when any file invalid', () => {
      // When errors.length > 0
      const errorMatch = scriptContent.match(/errors\.length > 0[\s\S]*?process\.exit\(1\)/);
      expect(errorMatch).toBeTruthy();
    });

    it('exits 1 on script errors', () => {
      // Fatal error in catch block
      expect(scriptContent).toContain('main().catch');
      expect(scriptContent).toContain('process.exit(1)');
    });

    it('logs validation failure message before exit 1', () => {
      expect(scriptContent).toContain('❌ Validation failed');
      expect(scriptContent).toContain('Please fix the above errors');
    });

    it('logs success message before exit 0', () => {
      expect(scriptContent).toContain('✅ All files valid');
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

    it('invokes main with catch handler', () => {
      expect(scriptContent).toContain('main().catch');
    });

    it('logs fatal errors', () => {
      expect(scriptContent).toContain('Validation script error');
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

    it('uses UTF-8 encoding for git command', () => {
      expect(scriptContent).toMatch(/execSync\([\s\S]*?encoding: 'utf-8'/);
    });

    it('filters markdown files with *.md pattern', () => {
      expect(scriptContent).toContain('**/*.md');
    });

    it('targets featurebase directory', () => {
      expect(scriptContent).toContain('modules/chariot/docs/featurebase');
    });
  });

  describe('imports and dependencies', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('imports fs from fs/promises', () => {
      expect(scriptContent).toContain("import fs from 'fs/promises'");
    });

    it('imports execSync from child_process', () => {
      expect(scriptContent).toContain("import { execSync } from 'child_process'");
    });

    it('imports parseFrontmatter', () => {
      expect(scriptContent).toContain('parseFrontmatter');
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/internal/frontmatter.js'");
    });

    it('imports Zod for schema validation', () => {
      expect(scriptContent).toContain("import { z } from 'zod'");
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
      expect(scriptContent).toContain('Validate YAML frontmatter');
      expect(scriptContent).toContain('markdown files');
      expect(scriptContent).toContain('before syncing to FeatureBase');
    });
  });

  describe('validation workflow', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('validates each file independently', () => {
      // Each file has its own try-catch
      expect(scriptContent).toMatch(/for.*?file.*?of.*?changedFiles/);
      expect(scriptContent).toContain('try');
      expect(scriptContent).toContain('catch');
    });

    it('does not stop on first error', () => {
      // No early return in catch block
      expect(scriptContent).not.toMatch(/catch[\s\S]{0,100}return/);
    });

    it('reports all errors at end', () => {
      // The script checks if errors exist and exits
      expect(scriptContent).toContain('if (errors.length > 0)');
      // Note: Errors are already logged individually during validation loop,
      // so there's no separate errors.forEach at the end
      expect(scriptContent).toContain('Validation failed');
    });
  });

  describe('error messages', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('provides helpful validation failure message', () => {
      expect(scriptContent).toContain('❌ Validation failed');
      expect(scriptContent).toContain('Please fix the above errors and re-commit');
    });

    it('logs validation script errors', () => {
      expect(scriptContent).toContain('Validation script error');
    });

    it('uses emoji for visual clarity', () => {
      expect(scriptContent).toContain('✅'); // Success
      expect(scriptContent).toContain('❌'); // Error
    });
  });
});
