/**
 * Integration Tests for get-team Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 *
 * Usage:
 * npx vitest run get-team.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTeam } from './get-team';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('getTeam - Integration Tests', () => {
  const TEST_TEAM = process.env.TEST_TEAM || 'Chariot Team';

  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
    console.log(`Test team: ${TEST_TEAM}`);
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should get team by name', async () => {
    const result = await getTeam.execute({ query: TEST_TEAM });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBeDefined();

    console.log('Found team:', {
      id: result.id,
      name: result.name,
      key: result.key,
    });
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await getTeam.execute({ query: TEST_TEAM });

    const keys = Object.keys(result);
    const allowedKeys = ['id', 'key', 'name', 'description', 'createdAt', 'updatedAt'];

    keys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(result).not.toHaveProperty('private');
    expect(result).not.toHaveProperty('issueCount');
    expect(result).not.toHaveProperty('memberCount');
    expect(result).not.toHaveProperty('states');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      getTeam.execute({ query: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      getTeam.execute({ query: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      getTeam.execute({ query: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await getTeam.execute({ query: TEST_TEAM });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await getTeam.execute({ query: TEST_TEAM });

      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
    });

    it('should return UUID format for team id', async () => {
      const result = await getTeam.execute({ query: TEST_TEAM });
      expect(result.id).toMatch(/^[a-f0-9-]{36}$/i);
    });
  });
});
