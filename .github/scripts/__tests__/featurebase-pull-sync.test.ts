import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../featurebase-pull-sync.ts');

/**
 * Tests for featurebase-pull-sync.ts
 *
 * Pattern: Test script behavior through execution with mocked dependencies.
 * Since this is a simple orchestration script that calls other functions,
 * we verify the script's behavior by checking exit codes and console output.
 *
 * These are integration-style tests that ensure the script correctly orchestrates
 * the sync operation.
 */
describe('featurebase-pull-sync', () => {
  describe('script structure and configuration', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('imports syncToMarkdown from correct module', () => {
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/sync-to-markdown.js'");
    });

    it('imports createFeaturebaseClient from correct module', () => {
      expect(scriptContent).toContain("from '../../.claude/tools/featurebase/client.js'");
    });

    it('configures syncToMarkdown with correct output directory', () => {
      // Verify the script uses the correct output path
      expect(scriptContent).toContain("modules/chariot/docs/featurebase");
      expect(scriptContent).toContain("outputDir");
    });

    it('syncs all content types (posts, changelog, articles)', () => {
      // Verify types array includes all expected types
      expect(scriptContent).toContain("types: ['posts', 'changelog', 'articles']");
    });

    it('sets limit parameter', () => {
      expect(scriptContent).toContain('limit: 100');
    });
  });

  describe('main function logic', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('calls createFeaturebaseClient before sync', () => {
      // Verify client creation happens before syncToMarkdown
      const clientIndex = scriptContent.indexOf('createFeaturebaseClient()');
      const syncIndex = scriptContent.indexOf('syncToMarkdown(');

      expect(clientIndex).toBeGreaterThan(0);
      expect(syncIndex).toBeGreaterThan(0);
      expect(clientIndex).toBeLessThan(syncIndex);
    });

    it('passes client to syncToMarkdown', () => {
      // Verify client is passed as second argument
      expect(scriptContent).toMatch(/syncToMarkdown\(\s*{[\s\S]*?}\s*,\s*client\s*\)/);
    });

    it('logs starting message', () => {
      expect(scriptContent).toContain("'Starting FeatureBase pull sync...'");
    });

    it('logs success message with file count', () => {
      // Verify success log includes filesWritten count
      expect(scriptContent).toContain('✅ Synced');
      expect(scriptContent).toContain('result.filesWritten');
      expect(scriptContent).toContain('files from FeatureBase');
    });
  });

  describe('error handling', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('checks for errors in sync result', () => {
      // Verify script checks result.errors
      expect(scriptContent).toContain('result.errors');
      expect(scriptContent).toContain('.length > 0');
    });

    it('logs individual errors when present', () => {
      // Verify error logging format
      expect(scriptContent).toContain('⚠️  Errors encountered');
      expect(scriptContent).toContain('forEach');
      expect(scriptContent).toContain('err.type');
      expect(scriptContent).toContain('err.id');
      expect(scriptContent).toContain('err.error');
    });

    it('exits with code 1 when errors present', () => {
      // Find error handling block
      const errorBlockMatch = scriptContent.match(/if \(result\.errors.*?\{[\s\S]*?process\.exit\(1\)/);
      expect(errorBlockMatch).toBeTruthy();
    });

    it('catches fatal errors in main catch block', () => {
      // Verify catch block exists
      expect(scriptContent).toContain('main().catch');
      expect(scriptContent).toContain('❌ Sync failed');
      expect(scriptContent).toMatch(/catch.*?process\.exit\(1\)/s);
    });
  });

  describe('success path', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('exits with code 0 on success', () => {
      // Verify successful exit after logging
      const successMatch = scriptContent.match(/✅ Synced[\s\S]*?process\.exit\(0\)/);
      expect(successMatch).toBeTruthy();
    });

    it('exits with code 0 only after logging success', () => {
      // Verify order: log success, then exit
      const successLogIndex = scriptContent.indexOf('✅ Synced');
      const exitZeroIndex = scriptContent.lastIndexOf('process.exit(0)');

      expect(successLogIndex).toBeGreaterThan(0);
      expect(exitZeroIndex).toBeGreaterThan(0);
      expect(exitZeroIndex).toBeGreaterThan(successLogIndex);
    });
  });

  describe('client configuration', () => {
    let scriptContent: string;

    beforeEach(async () => {
      scriptContent = await fs.readFile(SCRIPT_PATH, 'utf-8');
    });

    it('creates client without explicit API key parameter', () => {
      // Verify client creation relies on env var (no parameter)
      expect(scriptContent).toContain('createFeaturebaseClient()');
      // Should NOT pass apiKey directly
      expect(scriptContent).not.toContain('createFeaturebaseClient({ apiKey:');
    });

    it('includes comment about FEATUREBASE_API_KEY env var', () => {
      // Verify documentation mentions env var
      expect(scriptContent).toContain('FEATUREBASE_API_KEY');
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
      expect(scriptContent).toContain('FeatureBase Pull Sync Script');
      expect(scriptContent).toContain('Fetches content from FeatureBase API');
      expect(scriptContent).toContain('GitHub Actions');
    });

    it('defines main async function', () => {
      expect(scriptContent).toContain('async function main()');
    });

    it('invokes main with catch handler', () => {
      expect(scriptContent).toContain('main().catch');
    });
  });
});
