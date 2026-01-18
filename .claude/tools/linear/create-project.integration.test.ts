/**
 * Integration Tests for create-project Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 * - Permission to create projects
 *
 * Usage:
 * npx vitest run create-project.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 *
 * WARNING: These tests will create real projects in Linear!
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createProject } from './create-project';
import { listTeams } from './list-teams';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('createProject - Integration Tests', () => {
  let testTeamName: string | undefined;

  beforeAll(async () => {
    console.log('Running integration tests against real Linear MCP');
    console.log('WARNING: These tests will create real projects!');

    // Find a team to create projects in
    const teams = await listTeams.execute({ limit: 1 });
    if (teams.teams.length > 0) {
      testTeamName = teams.teams[0].name;
      console.log(`Using test team: ${testTeamName}`);
    }
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should create project', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const projectName = `Test Project ${Date.now()}`;
    const result = await createProject.execute({
      name: projectName,
      team: testTeamName,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.project.id).toBeDefined();
    expect(result.project.name).toBe(projectName);
    expect(result.project.url).toBeDefined();

    console.log('Created project:', {
      id: result.project.id,
      name: result.project.name,
      url: result.project.url,
    });
  });

  it('Real MCP Server: should create project with description', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createProject.execute({
      name: `Desc Test ${Date.now()}`,
      team: testTeamName,
      description: 'Test project with description',
    });

    expect(result.success).toBe(true);
    console.log('Created project with description:', result.project.id);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createProject.execute({
      name: `Token Test ${Date.now()}`,
      team: testTeamName,
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
    expect(result.project).not.toHaveProperty('createdAt');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      createProject.execute({ name: 'Test', team: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      createProject.execute({ name: 'Test', team: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      createProject.execute({ name: 'Test\x00null', team: 'Eng' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should throw for non-existent team', async () => {
    await expect(
      createProject.execute({ name: 'Test', team: 'nonexistent-team-12345-xyz' })
    ).rejects.toThrow();
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const start = Date.now();
    await createProject.execute({
      name: `Perf Test ${Date.now()}`,
      team: testTeamName,
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
      if (!testTeamName) {
        console.log('Skipping: No test team available');
        return;
      }

      const result = await createProject.execute({
        name: `Schema Test ${Date.now()}`,
        team: testTeamName,
      });

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.project.id).toBe('string');
      expect(typeof result.project.name).toBe('string');
      expect(typeof result.project.url).toBe('string');
    });

    it('should return UUID format for project id', async () => {
      if (!testTeamName) {
        console.log('Skipping: No test team available');
        return;
      }

      const result = await createProject.execute({
        name: `UUID Test ${Date.now()}`,
        team: testTeamName,
      });

      expect(result.project.id).toMatch(/^[a-f0-9-]{36}$/i);
    });
  });
});
