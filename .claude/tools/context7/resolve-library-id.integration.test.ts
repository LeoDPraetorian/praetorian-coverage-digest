/**
 * Integration Tests for resolve-library-id Wrapper
 *
 * These tests run against the REAL Context7 MCP server.
 *
 * Prerequisites:
 * - Context7 MCP server configured
 * - Network access to Context7 API (Upstash)
 *
 * Usage:
 * npx vitest run resolve-library-id.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolveLibraryId } from './resolve-library-id';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('resolveLibraryId - Integration Tests', () => {
  // Use well-known libraries for testing
  const TEST_LIBRARY = 'react';

  beforeAll(() => {
    console.log('Running integration tests against real Context7 MCP');
    console.log(`Test library: ${TEST_LIBRARY}`);
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should resolve library ID', async () => {
    const result = await resolveLibraryId.execute({
      libraryName: TEST_LIBRARY,
    });

    expect(result).toBeDefined();
    expect(result.libraries).toBeDefined();
    expect(Array.isArray(result.libraries)).toBe(true);
    expect(result.totalResults).toBeGreaterThan(0);

    console.log('Found libraries:', {
      totalResults: result.totalResults,
      firstLibrary: result.libraries[0],
    });
  });

  it('Real MCP Server: should find react library', async () => {
    const result = await resolveLibraryId.execute({
      libraryName: 'react',
    });

    // Should find React in results
    const reactLib = result.libraries.find(
      lib => lib.name.toLowerCase().includes('react') || lib.id.includes('react')
    );

    expect(reactLib).toBeDefined();
    expect(reactLib?.id).toBeDefined();
  });

  it('Real MCP Server: should find TypeScript library', async () => {
    const result = await resolveLibraryId.execute({
      libraryName: 'typescript',
    });

    expect(result.libraries.length).toBeGreaterThan(0);

    const tsLib = result.libraries.find(
      lib => lib.name.toLowerCase().includes('typescript') || lib.id.includes('typescript')
    );

    expect(tsLib).toBeDefined();
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await resolveLibraryId.execute({
      libraryName: TEST_LIBRARY,
    });

    // Check required fields exist
    expect(result).toHaveProperty('libraries');
    expect(result).toHaveProperty('totalResults');

    // Check library structure
    if (result.libraries.length > 0) {
      const lib = result.libraries[0];
      expect(lib).toHaveProperty('id');
      expect(lib).toHaveProperty('name');
      // Optional fields
      expect(lib.description === undefined || typeof lib.description === 'string').toBe(true);
      expect(lib.codeSnippets === undefined || typeof lib.codeSnippets === 'number').toBe(true);
    }
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    // Path traversal
    await expect(
      resolveLibraryId.execute({ libraryName: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    // Command injection
    await expect(
      resolveLibraryId.execute({ libraryName: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters
    await expect(
      resolveLibraryId.execute({ libraryName: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await resolveLibraryId.execute({
      libraryName: TEST_LIBRARY,
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
      const result = await resolveLibraryId.execute({
        libraryName: TEST_LIBRARY,
      });

      expect(Array.isArray(result.libraries)).toBe(true);
      expect(typeof result.totalResults).toBe('number');
    });

    it('should return library objects with required fields', async () => {
      const result = await resolveLibraryId.execute({
        libraryName: TEST_LIBRARY,
      });

      if (result.libraries.length > 0) {
        const lib = result.libraries[0];
        expect(typeof lib.id).toBe('string');
        expect(typeof lib.name).toBe('string');
      }
    });

    it('should return Context7-compatible library IDs', async () => {
      const result = await resolveLibraryId.execute({
        libraryName: TEST_LIBRARY,
      });

      if (result.libraries.length > 0) {
        // Context7 IDs start with /
        const lib = result.libraries[0];
        expect(lib.id.startsWith('/')).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle uncommon library names', async () => {
      const result = await resolveLibraryId.execute({
        libraryName: 'zod',
      });

      expect(result.libraries).toBeDefined();
      expect(Array.isArray(result.libraries)).toBe(true);
    });

    it('should handle scoped package searches', async () => {
      const result = await resolveLibraryId.execute({
        libraryName: '@types/node',
      });

      expect(result.libraries).toBeDefined();
      expect(Array.isArray(result.libraries)).toBe(true);
    });
  });
});
