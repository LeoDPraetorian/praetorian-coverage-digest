/**
 * Integration Tests for update-cycle Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 * - A test cycle to update (will be modified!)
 *
 * Usage:
 * npx vitest run update-cycle.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 *
 * WARNING: These tests will modify real data in Linear!
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { updateCycle } from './update-cycle';
import { listCycles } from './list-cycles';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('updateCycle - Integration Tests', () => {
  let testCycleId: string | undefined;

  beforeAll(async () => {
    console.log('Running integration tests against real Linear MCP');
    console.log('WARNING: These tests will modify real cycle data!');

    // Find a cycle to use for testing
    const cycles = await listCycles.execute({ limit: 1 });
    if (cycles.cycles.length > 0) {
      testCycleId = cycles.cycles[0].id;
      console.log(`Using test cycle: ${testCycleId}`);
    }
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should update cycle name', async () => {
    if (!testCycleId) {
      console.log('Skipping: No test cycle available');
      return;
    }

    const originalName = `Test Cycle ${Date.now()}`;
    const result = await updateCycle.execute({
      id: testCycleId,
      name: originalName,
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(testCycleId);
    expect(result.name).toBe(originalName);
    expect(result.updatedAt).toBeDefined();

    console.log('Updated cycle:', {
      id: result.id,
      name: result.name,
      updatedAt: result.updatedAt,
    });
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    if (!testCycleId) {
      console.log('Skipping: No test cycle available');
      return;
    }

    const result = await updateCycle.execute({
      id: testCycleId,
      name: `Token Test ${Date.now()}`,
    });

    const keys = Object.keys(result);
    const allowedKeys = ['id', 'name', 'number', 'team', 'startsAt', 'endsAt', 'updatedAt'];

    keys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(result).not.toHaveProperty('issueCount');
    expect(result).not.toHaveProperty('completedIssueCount');
    expect(result).not.toHaveProperty('progress');
    expect(result).not.toHaveProperty('description');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      updateCycle.execute({ id: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      updateCycle.execute({ id: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      updateCycle.execute({ id: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should throw for non-existent cycle', async () => {
    await expect(
      updateCycle.execute({ id: 'non-existent-cycle-id-12345' })
    ).rejects.toThrow();
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    if (!testCycleId) {
      console.log('Skipping: No test cycle available');
      return;
    }

    const start = Date.now();
    await updateCycle.execute({
      id: testCycleId,
      name: `Perf Test ${Date.now()}`,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      if (!testCycleId) {
        console.log('Skipping: No test cycle available');
        return;
      }

      const result = await updateCycle.execute({
        id: testCycleId,
        name: `Schema Test ${Date.now()}`,
      });

      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      if (result.updatedAt) {
        expect(typeof result.updatedAt).toBe('string');
      }
    });

    it('should return UUID format for cycle id', async () => {
      if (!testCycleId) {
        console.log('Skipping: No test cycle available');
        return;
      }

      const result = await updateCycle.execute({
        id: testCycleId,
        name: `UUID Test ${Date.now()}`,
      });

      expect(result.id).toMatch(/^[a-f0-9-]{36}$/i);
    });
  });
});
