/**
 * Integration Tests for get-library-docs Wrapper
 *
 * These tests run against the REAL Context7 MCP server.
 *
 * Prerequisites:
 * - Context7 MCP server configured
 * - Network access to Context7 API (Upstash)
 *
 * Usage:
 * npx vitest run get-library-docs.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getLibraryDocs } from './get-library-docs';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('getLibraryDocs - Integration Tests', () => {
  // Use a well-known library for testing
  const TEST_LIBRARY_ID = '/facebook/react';

  beforeAll(() => {
    console.log('Running integration tests against real Context7 MCP');
    console.log(`Test library: ${TEST_LIBRARY_ID}`);
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should fetch library documentation', async () => {
    const result = await getLibraryDocs.execute({
      context7CompatibleLibraryID: TEST_LIBRARY_ID,
    });

    expect(result).toBeDefined();
    expect(result.libraryId).toBe(TEST_LIBRARY_ID);
    expect(result.libraryName).toBe('react');
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);

    console.log('Fetched documentation:', {
      libraryId: result.libraryId,
      libraryName: result.libraryName,
      contentLength: result.content.length,
      estimatedTokens: result.estimatedTokens,
    });
  });

  it('Real MCP Server: should respect mode parameter', async () => {
    const codeResult = await getLibraryDocs.execute({
      context7CompatibleLibraryID: TEST_LIBRARY_ID,
      mode: 'code',
    });

    const infoResult = await getLibraryDocs.execute({
      context7CompatibleLibraryID: TEST_LIBRARY_ID,
      mode: 'info',
    });

    expect(codeResult.mode).toBe('code');
    expect(infoResult.mode).toBe('info');

    // Both should return content, but content may differ
    expect(codeResult.content).toBeDefined();
    expect(infoResult.content).toBeDefined();
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await getLibraryDocs.execute({
      context7CompatibleLibraryID: TEST_LIBRARY_ID,
    });

    // Check required fields exist
    expect(result).toHaveProperty('libraryId');
    expect(result).toHaveProperty('libraryName');
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('fetchedAt');
    expect(result).toHaveProperty('mode');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('estimatedTokens');

    // Verify token estimate is reasonable
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.estimatedTokens).toBeLessThan(10000); // Reasonable upper bound
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    // Path traversal
    await expect(
      getLibraryDocs.execute({ context7CompatibleLibraryID: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    // Command injection
    await expect(
      getLibraryDocs.execute({ context7CompatibleLibraryID: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters
    await expect(
      getLibraryDocs.execute({ context7CompatibleLibraryID: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await getLibraryDocs.execute({
      context7CompatibleLibraryID: TEST_LIBRARY_ID,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(30000); // 30 seconds max (network latency)
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: TEST_LIBRARY_ID,
      });

      expect(typeof result.libraryId).toBe('string');
      expect(typeof result.libraryName).toBe('string');
      expect(typeof result.content).toBe('string');
      expect(typeof result.fetchedAt).toBe('string');
      expect(typeof result.estimatedTokens).toBe('number');
    });

    it('should return ISO timestamp for fetchedAt', async () => {
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: TEST_LIBRARY_ID,
      });

      // ISO 8601 format: 2024-01-15T10:30:00.000Z
      expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should derive library name from library ID', async () => {
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/npm/lodash',
      });

      expect(result.libraryName).toBe('lodash');
    });
  });
});
