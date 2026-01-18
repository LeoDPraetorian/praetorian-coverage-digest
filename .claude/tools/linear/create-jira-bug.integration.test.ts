/**
 * Integration Tests for create-jira-bug Wrapper
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
 * npx vitest run create-jira-bug.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 *
 * WARNING: These tests will create real bug issues in Linear!
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createJiraBug } from './create-jira-bug';
import { listTeams } from './list-teams';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('createJiraBug - Integration Tests', () => {
  let testTeamName: string | undefined;

  beforeAll(async () => {
    console.log('Running integration tests against real Linear MCP');
    console.log('WARNING: These tests will create real Jira bug issues!');

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

  it('Real MCP Server: should create Jira bug', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const bugTitle = `Test Jira Bug ${Date.now()}`;
    const result = await createJiraBug.execute({
      title: bugTitle,
      team: testTeamName,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.issue.id).toBeDefined();
    expect(result.issue.identifier).toBeDefined();
    expect(result.issue.title).toBe(bugTitle);
    expect(result.issue.url).toBeDefined();

    console.log('Created Jira bug:', {
      id: result.issue.id,
      identifier: result.issue.identifier,
      title: result.issue.title,
      url: result.issue.url,
    });
  });

  it('Real MCP Server: should create Jira bug with error details', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createJiraBug.execute({
      title: `Jira Error Test ${Date.now()}`,
      team: testTeamName,
      errorCode: 400,
      errorMessage: 'Bad Request - Invalid field mapping',
    });

    expect(result.success).toBe(true);
    console.log('Created Jira bug with error details:', result.issue.identifier);
  });

  it('Real MCP Server: should create Jira bug with custom description', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createJiraBug.execute({
      title: `Custom Jira Bug ${Date.now()}`,
      description: '## Custom Report\nThis is a custom Jira bug description.',
      team: testTeamName,
    });

    expect(result.success).toBe(true);
    console.log('Created Jira bug with custom description:', result.issue.identifier);
  });

  it('Real MCP Server: should create Jira bug with priority override', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createJiraBug.execute({
      title: `Lower Priority Jira Bug ${Date.now()}`,
      team: testTeamName,
      priority: 3, // Override default 1 (Urgent)
    });

    expect(result.success).toBe(true);
    console.log('Created lower priority Jira bug:', result.issue.identifier);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    if (!testTeamName) {
      console.log('Skipping: No test team available');
      return;
    }

    const result = await createJiraBug.execute({
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
      createJiraBug.execute({ title: 'Bug', team: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      createJiraBug.execute({ title: 'Bug', team: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      createJiraBug.execute({ title: 'Bug\x00null', team: 'Eng' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should throw for non-existent team', async () => {
    await expect(
      createJiraBug.execute({ title: 'Bug', team: 'nonexistent-team-12345-xyz' })
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
    await createJiraBug.execute({
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

      const result = await createJiraBug.execute({
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

      const result = await createJiraBug.execute({
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

      const result = await createJiraBug.execute({
        title: `Identifier Test ${Date.now()}`,
        team: testTeamName,
      });

      // Identifier should match pattern like "ENG-123" or "TEAM-456"
      expect(result.issue.identifier).toMatch(/^[A-Z]+-\d+$/);
    });
  });
});
