/**
 * Integration Tests for get-project Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 *
 * Usage:
 * npx vitest run get-project.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getProject } from './get-project';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('getProject - Integration Tests', () => {
  const TEST_PROJECT = process.env.TEST_PROJECT || 'Test Project';

  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
    console.log(`Test project: ${TEST_PROJECT}`);
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should get project by name', async () => {
    const result = await getProject.execute({ query: TEST_PROJECT });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBeDefined();

    console.log('Found project:', {
      id: result.id,
      name: result.name,
      state: result.state?.name,
    });
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await getProject.execute({ query: TEST_PROJECT });

    const keys = Object.keys(result);
    const allowedKeys = ['id', 'name', 'description', 'state', 'lead', 'startDate', 'targetDate', 'createdAt', 'updatedAt'];

    keys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(result).not.toHaveProperty('issueCount');
    expect(result).not.toHaveProperty('completedIssueCount');
    expect(result).not.toHaveProperty('teams');
    expect(result).not.toHaveProperty('milestones');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      getProject.execute({ query: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      getProject.execute({ query: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      getProject.execute({ query: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await getProject.execute({ query: TEST_PROJECT });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await getProject.execute({ query: TEST_PROJECT });

      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
    });

    it('should return UUID format for project id', async () => {
      const result = await getProject.execute({ query: TEST_PROJECT });
      expect(result.id).toMatch(/^[a-f0-9-]{36}$/i);
    });
  });
});
