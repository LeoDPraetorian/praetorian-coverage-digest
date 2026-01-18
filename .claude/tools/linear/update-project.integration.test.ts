/**
 * Integration Tests for update-project Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 * - A test project to update (will be modified!)
 *
 * Usage:
 * npx vitest run update-project.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 *
 * WARNING: These tests will modify real data in Linear!
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { updateProject } from './update-project';
import { listProjects } from './list-projects';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('updateProject - Integration Tests', () => {
  let testProjectId: string | undefined;

  beforeAll(async () => {
    console.log('Running integration tests against real Linear MCP');
    console.log('WARNING: These tests will modify real project data!');

    // Find a project to use for testing
    const projects = await listProjects.execute({ limit: 1 });
    if (projects.projects.length > 0) {
      testProjectId = projects.projects[0].id;
      console.log(`Using test project: ${testProjectId}`);
    }
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should update project name', async () => {
    if (!testProjectId) {
      console.log('Skipping: No test project available');
      return;
    }

    const newName = `Test Project ${Date.now()}`;
    const result = await updateProject.execute({
      id: testProjectId,
      name: newName,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.project.id).toBe(testProjectId);
    expect(result.project.name).toBe(newName);
    expect(result.project.url).toBeDefined();

    console.log('Updated project:', {
      id: result.project.id,
      name: result.project.name,
      url: result.project.url,
    });
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    if (!testProjectId) {
      console.log('Skipping: No test project available');
      return;
    }

    const result = await updateProject.execute({
      id: testProjectId,
      summary: `Token Test ${Date.now()}`,
    });

    // Verify only allowed keys are present
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('project');

    const projectKeys = Object.keys(result.project);
    const allowedKeys = ['id', 'name', 'url'];

    projectKeys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(result.project).not.toHaveProperty('description');
    expect(result.project).not.toHaveProperty('state');
    expect(result.project).not.toHaveProperty('lead');
    expect(result.project).not.toHaveProperty('updatedAt');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      updateProject.execute({ id: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      updateProject.execute({ id: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      updateProject.execute({ id: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should throw for non-existent project', async () => {
    await expect(
      updateProject.execute({ id: 'non-existent-project-id-12345' })
    ).rejects.toThrow();
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    if (!testProjectId) {
      console.log('Skipping: No test project available');
      return;
    }

    const start = Date.now();
    await updateProject.execute({
      id: testProjectId,
      summary: `Perf Test ${Date.now()}`,
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
      if (!testProjectId) {
        console.log('Skipping: No test project available');
        return;
      }

      const result = await updateProject.execute({
        id: testProjectId,
        summary: `Schema Test ${Date.now()}`,
      });

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.project.id).toBe('string');
      expect(typeof result.project.name).toBe('string');
      expect(typeof result.project.url).toBe('string');
    });

    it('should return UUID format for project id', async () => {
      if (!testProjectId) {
        console.log('Skipping: No test project available');
        return;
      }

      const result = await updateProject.execute({
        id: testProjectId,
        summary: `UUID Test ${Date.now()}`,
      });

      expect(result.project.id).toMatch(/^[a-f0-9-]{36}$/i);
    });
  });
});
