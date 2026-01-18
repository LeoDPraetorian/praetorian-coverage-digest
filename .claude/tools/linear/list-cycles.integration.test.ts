/**
 * Integration Tests for list-cycles Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 *
 * Usage:
 * npx vitest run list-cycles.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { listCycles } from './list-cycles';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('listCycles - Integration Tests', () => {
  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should list cycles', async () => {
    const result = await listCycles.execute({});

    expect(result).toBeDefined();
    expect(result.totalCycles).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.cycles)).toBe(true);

    console.log(`Found ${result.totalCycles} cycles`);
    if (result.cycles.length > 0) {
      console.log('First cycle:', {
        id: result.cycles[0].id,
        name: result.cycles[0].name,
        number: result.cycles[0].number,
      });
    }
  });

  it('Real MCP Server: should search cycles by query', async () => {
    const result = await listCycles.execute({ query: 'Sprint' });

    expect(result).toBeDefined();
    expect(Array.isArray(result.cycles)).toBe(true);

    console.log(`Found ${result.totalCycles} cycles matching 'Sprint'`);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await listCycles.execute({ limit: 5 });

    if (result.cycles.length > 0) {
      const cycle = result.cycles[0];
      const keys = Object.keys(cycle);
      const allowedKeys = ['id', 'name', 'number', 'team', 'startsAt', 'endsAt', 'createdAt', 'updatedAt'];

      keys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });

      // Verbose fields should NOT be present
      expect(cycle).not.toHaveProperty('issueCount');
      expect(cycle).not.toHaveProperty('completedIssueCount');
      expect(cycle).not.toHaveProperty('progress');
      expect(cycle).not.toHaveProperty('description');
    }
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      listCycles.execute({ query: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      listCycles.execute({ team: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      listCycles.execute({ query: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await listCycles.execute({ limit: 10 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await listCycles.execute({ limit: 5 });

      expect(typeof result.totalCycles).toBe('number');
      expect(Array.isArray(result.cycles)).toBe(true);

      if (result.cycles.length > 0) {
        const cycle = result.cycles[0];
        expect(typeof cycle.id).toBe('string');
        expect(typeof cycle.name).toBe('string');
      }
    });

    it('should return UUID format for cycle ids', async () => {
      const result = await listCycles.execute({ limit: 5 });

      result.cycles.forEach(cycle => {
        expect(cycle.id).toMatch(/^[a-f0-9-]{36}$/i);
      });
    });
  });
});
