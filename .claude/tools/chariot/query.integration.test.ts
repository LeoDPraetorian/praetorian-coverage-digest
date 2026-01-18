/**
 * Integration Tests for Chariot Query Wrapper
 *
 * These tests run against the REAL Chariot MCP server.
 *
 * Prerequisites:
 * - Chariot MCP server configured
 * - Valid Chariot credentials (stack, username)
 * - Network access to Chariot API
 *
 * Usage:
 * npx vitest run query.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { query, commonQueries } from './query';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

// Test configuration - uses environment variables or defaults
const TEST_STACK = process.env.CHARIOT_STACK || 'production';
const TEST_USERNAME = process.env.CHARIOT_USERNAME || 'test@example.com';

describe.skipIf(!runIntegration)('query - Integration Tests', () => {
  beforeAll(() => {
    console.log('Running integration tests against real Chariot MCP');
    console.log(`Test stack: ${TEST_STACK}`);
    console.log(`Test username: ${TEST_USERNAME}`);
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should execute basic asset query', async () => {
    const queryStructure = commonQueries.activeAssetsByClass('domain');

    const result = await query.execute({
      query: JSON.stringify(queryStructure),
      stack: TEST_STACK,
      username: TEST_USERNAME,
      tree: false,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(typeof result.totalCount).toBe('number');
    expect(typeof result.estimatedTokens).toBe('number');

    console.log('Query result:', {
      resultCount: result.results.length,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      estimatedTokens: result.estimatedTokens,
    });
  });

  it('Real MCP Server: should execute risk query', async () => {
    const queryStructure = commonQueries.highSeverityRisks(5.0);

    const result = await query.execute({
      query: JSON.stringify(queryStructure),
      stack: TEST_STACK,
      username: TEST_USERNAME,
      tree: false,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(typeof result.totalCount).toBe('number');
  });

  it('Real MCP Server: should handle tree parameter', async () => {
    const queryStructure = {
      node: {
        labels: ['Asset'],
        filters: [{ field: 'status', operator: '=', value: 'A' }],
      },
      limit: 10,
    };

    const result = await query.execute({
      query: JSON.stringify(queryStructure),
      stack: TEST_STACK,
      username: TEST_USERNAME,
      tree: true,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const queryStructure = commonQueries.activeAssetsByClass('domain');

    const result = await query.execute({
      query: JSON.stringify(queryStructure),
      stack: TEST_STACK,
      username: TEST_USERNAME,
    });

    // Check required fields exist in output
    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('totalCount');
    expect(result).toHaveProperty('estimatedTokens');

    // Verify each result has essential fields only
    if (result.results.length > 0) {
      const firstResult = result.results[0];
      expect(firstResult).toHaveProperty('key');
      // Should not have verbose fields
      expect(firstResult).not.toHaveProperty('verboseField');
      expect(firstResult).not.toHaveProperty('metadata');
    }

    // Verify token estimate is reasonable
    expect(result.estimatedTokens).toBeGreaterThanOrEqual(0);
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    // Path traversal in stack
    await expect(
      query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: '../../../etc/passwd',
        username: TEST_USERNAME,
      })
    ).rejects.toThrow();

    // Command injection in username
    await expect(
      query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: TEST_STACK,
        username: '; rm -rf /',
      })
    ).rejects.toThrow();
  });

  it('should handle invalid query structure', async () => {
    await expect(
      query.execute({
        query: '{"invalid":"structure"}',
        stack: TEST_STACK,
        username: TEST_USERNAME,
      })
    ).rejects.toThrow(/Invalid query structure/);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const queryStructure = {
      node: {
        labels: ['Asset'],
        filters: [{ field: 'status', operator: '=', value: 'A' }],
      },
      limit: 10,
    };

    const start = Date.now();
    await query.execute({
      query: JSON.stringify(queryStructure),
      stack: TEST_STACK,
      username: TEST_USERNAME,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(30000); // 30 seconds max (network latency)
    console.log(`Query completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const queryStructure = commonQueries.activeAssetsByClass('domain');

      const result = await query.execute({
        query: JSON.stringify(queryStructure),
        stack: TEST_STACK,
        username: TEST_USERNAME,
      });

      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
      expect(typeof result.estimatedTokens).toBe('number');
      expect(result.hasMore === undefined || typeof result.hasMore === 'boolean').toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      // Query for non-existent data
      const queryStructure = {
        node: {
          labels: ['Asset'],
          filters: [
            { field: 'status', operator: '=', value: 'A' },
            { field: 'key', operator: '=', value: 'non-existent-asset-12345' },
          ],
        },
        limit: 10,
      };

      const result = await query.execute({
        query: JSON.stringify(queryStructure),
        stack: TEST_STACK,
        username: TEST_USERNAME,
      });

      expect(Array.isArray(result.results)).toBe(true);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Common Query Pattern Tests
  // ==========================================================================

  describe('Common Query Patterns', () => {
    it('should execute activeAssetsByClass pattern', async () => {
      const queryStructure = commonQueries.activeAssetsByClass('ipv4');

      const result = await query.execute({
        query: JSON.stringify(queryStructure),
        stack: TEST_STACK,
        username: TEST_USERNAME,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should execute highSeverityRisks pattern', async () => {
      const queryStructure = commonQueries.highSeverityRisks(7.0);

      const result = await query.execute({
        query: JSON.stringify(queryStructure),
        stack: TEST_STACK,
        username: TEST_USERNAME,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should execute assetsWithAttribute pattern', async () => {
      const queryStructure = commonQueries.assetsWithAttribute('tag');

      const result = await query.execute({
        query: JSON.stringify(queryStructure),
        stack: TEST_STACK,
        username: TEST_USERNAME,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });
  });
});
