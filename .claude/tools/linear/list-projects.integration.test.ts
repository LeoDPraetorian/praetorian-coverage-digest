/**
 * Integration Tests for list-projects Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 *
 * Usage:
 * npx vitest run list-projects.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { listProjects } from './list-projects';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('listProjects - Integration Tests', () => {
  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should list projects', async () => {
    const result = await listProjects.execute({});

    expect(result).toBeDefined();
    expect(result.totalProjects).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.projects)).toBe(true);

    console.log(`Found ${result.totalProjects} projects`);
    if (result.projects.length > 0) {
      console.log('First project:', {
        id: result.projects[0].id,
        name: result.projects[0].name,
        state: result.projects[0].state,
      });
    }
  });

  it('Real MCP Server: should search projects by query', async () => {
    const result = await listProjects.execute({ query: 'Test' });

    expect(result).toBeDefined();
    expect(Array.isArray(result.projects)).toBe(true);

    console.log(`Found ${result.totalProjects} projects matching 'Test'`);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await listProjects.execute({ limit: 5 });

    if (result.projects.length > 0) {
      const project = result.projects[0];
      const keys = Object.keys(project);
      const allowedKeys = ['id', 'name', 'description', 'state', 'lead', 'startDate', 'targetDate', 'createdAt', 'updatedAt'];

      keys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });

      // Verbose fields should NOT be present
      expect(project).not.toHaveProperty('issueCount');
      expect(project).not.toHaveProperty('completedIssueCount');
      expect(project).not.toHaveProperty('teams');
      expect(project).not.toHaveProperty('milestones');
    }
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      listProjects.execute({ query: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      listProjects.execute({ team: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      listProjects.execute({ state: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await listProjects.execute({ limit: 10 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await listProjects.execute({ limit: 5 });

      expect(typeof result.totalProjects).toBe('number');
      expect(Array.isArray(result.projects)).toBe(true);

      if (result.projects.length > 0) {
        const project = result.projects[0];
        expect(typeof project.id).toBe('string');
        expect(typeof project.name).toBe('string');
      }
    });

    it('should return UUID format for project ids', async () => {
      const result = await listProjects.execute({ limit: 5 });

      result.projects.forEach(project => {
        expect(project.id).toMatch(/^[a-f0-9-]{36}$/i);
      });
    });
  });
});
