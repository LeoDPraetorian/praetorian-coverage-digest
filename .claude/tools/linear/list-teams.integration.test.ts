/**
 * Integration Tests for list-teams Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 *
 * Usage:
 * npx vitest run list-teams.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { listTeams } from './list-teams';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('listTeams - Integration Tests', () => {
  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should list teams', async () => {
    const result = await listTeams.execute({});

    expect(result).toBeDefined();
    expect(result.totalTeams).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.teams)).toBe(true);

    console.log(`Found ${result.totalTeams} teams`);
    if (result.teams.length > 0) {
      console.log('First team:', {
        id: result.teams[0].id,
        name: result.teams[0].name,
        key: result.teams[0].key,
      });
    }
  });

  it('Real MCP Server: should search teams by query', async () => {
    const result = await listTeams.execute({ query: 'Chariot' });

    expect(result).toBeDefined();
    expect(Array.isArray(result.teams)).toBe(true);

    console.log(`Found ${result.totalTeams} teams matching 'Chariot'`);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await listTeams.execute({ limit: 5 });

    if (result.teams.length > 0) {
      const team = result.teams[0];
      const keys = Object.keys(team);
      const allowedKeys = ['id', 'key', 'name', 'description', 'createdAt', 'updatedAt'];

      keys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });

      // Verbose fields should NOT be present
      expect(team).not.toHaveProperty('private');
      expect(team).not.toHaveProperty('issueCount');
      expect(team).not.toHaveProperty('memberCount');
      expect(team).not.toHaveProperty('states');
    }
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      listTeams.execute({ query: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      listTeams.execute({ query: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      listTeams.execute({ query: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await listTeams.execute({ limit: 10 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await listTeams.execute({ limit: 5 });

      expect(typeof result.totalTeams).toBe('number');
      expect(Array.isArray(result.teams)).toBe(true);

      if (result.teams.length > 0) {
        const team = result.teams[0];
        expect(typeof team.id).toBe('string');
        expect(typeof team.name).toBe('string');
      }
    });

    it('should return UUID format for team ids', async () => {
      const result = await listTeams.execute({ limit: 5 });

      result.teams.forEach(team => {
        expect(team.id).toMatch(/^[a-f0-9-]{36}$/i);
      });
    });
  });
});
