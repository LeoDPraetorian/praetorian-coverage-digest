/**
 * Integration Tests for create-bug Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 * - Permission to create issues
 *
 * Usage:
 * npx vitest run create-bug.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 *
 * WARNING: These tests will create real bug issues in Linear!
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createBug } from './create-bug';
import { listTeams } from './list-teams';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('createBug - Integration Tests', () => {
  let testTeamName: string | undefined;

  beforeAll(async () => {
    console.log('Running integration tests against real Linear MCP');
    console.log('WARNING: These tests will create real bug issues!');

    // Find a team to create issues in
    const teams = await listTeams.execute({ limit: 1 });
    if (teams.teams.length > 0) {
      testTeamName = teams.teams[0].name;
      console.log(`Using test team: ${testTeamName}`);
    }
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should create bug', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const bugTitle = `Test Bug ${Date.now()}`;
    const result = await createBug.execute({
      title: bugTitle,
      team: testTeamName,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.issue.id).toBeDefined();
    expect(result.issue.identifier).toBeDefined();
    expect(result.issue.title).toBe(bugTitle);
    expect(result.issue.url).toBeDefined();

    console.log('Created bug:', {
      id: result.issue.id,
      identifier: result.issue.identifier,
      title: result.issue.title,
      url: result.issue.url,
    });
  });

  it('Real MCP Server: should create bug with description', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createBug.execute({
      title: `Bug Test ${Date.now()}`,
      description: '## Steps to Reproduce\n1. Step one\n2. Step two',
      team: testTeamName,
    });

    expect(result.success).toBe(true);
    console.log('Created bug with description:', result.issue.identifier);
  });

  it('Real MCP Server: should create bug with priority', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createBug.execute({
      title: `Urgent Bug ${Date.now()}`,
      team: testTeamName,
      priority: 1,
    });

    expect(result.success).toBe(true);
    console.log('Created urgent bug:', result.issue.identifier);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createBug.execute({
      title: `Token Test ${Date.now()}`,
      team: testTeamName,
    });

    // Verify only allowed keys are present
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('issue');

    const issueKeys = Object.keys(result.issue);
    const allowedKeys = ['id', 'identifier', 'title', 'url'];

    issueKeys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(result.issue).not.toHaveProperty('description');
    expect(result.issue).not.toHaveProperty('state');
    expect(result.issue).not.toHaveProperty('assignee');
    expect(result.issue).not.toHaveProperty('createdAt');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      createBug.execute({ title: 'Bug', team: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      createBug.execute({ title: 'Bug', team: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      createBug.execute({ title: 'Bug\x00null', team: 'Eng' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should throw for non-existent team', async () => {
    await expect(
      createBug.execute({ title: 'Bug', team: 'nonexistent-team-12345-xyz' })
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
    await createBug.execute({
      title: `Perf Test ${Date.now()}`,
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

      const result = await createBug.execute({
        title: `Schema Test ${Date.now()}`,
        team: testTeamName,
      });

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.issue.id).toBe('string');
      expect(typeof result.issue.identifier).toBe('string');
      expect(typeof result.issue.title).toBe('string');
      expect(typeof result.issue.url).toBe('string');
    });

    it('should return UUID format for issue id', async () => {
      if (!testTeamName) {
        console.log('Skipping: No test team available');
        return;
      }

      const result = await createBug.execute({
        title: `UUID Test ${Date.now()}`,
        team: testTeamName,
      });

      expect(result.issue.id).toMatch(/^[a-f0-9-]{36}$/i);
    });

    it('should return proper identifier format', async () => {
      if (!testTeamName) {
        console.log('Skipping: No test team available');
        return;
      }

      const result = await createBug.execute({
        title: `Identifier Test ${Date.now()}`,
        team: testTeamName,
      });

      // Identifier should match pattern like "ENG-123" or "TEAM-456"
      expect(result.issue.identifier).toMatch(/^[A-Z]+-\d+$/);
    });
  });
});
