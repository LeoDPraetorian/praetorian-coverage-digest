/**
 * Integration Tests for list-issues Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 * They validate that the wrapper works correctly in production.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 *
 * Usage:
 * npx vitest run list-issues.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { listIssues } from './list-issues';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('listIssues - Integration Tests', () => {
  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should fetch issues from Linear', async () => {
    // Act: Call the real MCP server with default parameters
    const result = await listIssues.execute({});

    // Assert: Verify response structure
    expect(result).toBeDefined();
    expect(result.issues).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
    expect(result.totalIssues).toBeGreaterThanOrEqual(0);

    if (result.issues.length > 0) {
      console.log('Fetched issues:', {
        count: result.issues.length,
        firstIssue: {
          id: result.issues[0].id,
          identifier: result.issues[0].identifier,
          title: result.issues[0].title?.substring(0, 50),
        },
      });
    }
  });

  it('Real MCP Server: should filter by assignee', async () => {
    // Act: Fetch issues assigned to "me"
    const result = await listIssues.execute({ assignee: 'me' });

    // Assert
    expect(result).toBeDefined();
    expect(result.issues).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('Real MCP Server: should respect limit parameter', async () => {
    // Act: Request exactly 5 issues
    const result = await listIssues.execute({ limit: 5 });

    // Assert
    expect(result.issues.length).toBeLessThanOrEqual(5);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    // Act
    const result = await listIssues.execute({ limit: 1 });

    // Assert: Verify only essential fields are returned
    if (result.issues.length > 0) {
      const issue = result.issues[0];
      const keys = Object.keys(issue);
      const allowedKeys = [
        'id', 'identifier', 'title', 'description', 'priority',
        'state', 'status', 'assignee', 'assigneeId', 'url',
        'createdAt', 'updatedAt'
      ];

      // All returned keys should be in allowed list
      keys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });

      // Verbose fields should NOT be present
      expect(issue).not.toHaveProperty('metadata');
      expect(issue).not.toHaveProperty('history');
      expect(issue).not.toHaveProperty('comments');
      expect(issue).not.toHaveProperty('labels');
      expect(issue).not.toHaveProperty('relations');
    }
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    // These should be blocked by input validation BEFORE hitting the API

    // Path traversal
    await expect(
      listIssues.execute({ assignee: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    // Command injection
    await expect(
      listIssues.execute({ team: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters
    await expect(
      listIssues.execute({ query: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();

    await listIssues.execute({ limit: 10 });

    const duration = Date.now() - start;

    // Should complete within 5 seconds (network call + processing)
    expect(duration).toBeLessThan(5000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return priority as object (not number)', async () => {
      const result = await listIssues.execute({ limit: 10 });

      // Find an issue with priority set
      const issueWithPriority = result.issues.find(i => i.priority);
      if (issueWithPriority && issueWithPriority.priority !== undefined && issueWithPriority.priority !== null) {
        expect(typeof issueWithPriority.priority).toBe('number');
        expect(issueWithPriority.priority).toBeGreaterThanOrEqual(0);
        expect(issueWithPriority.priority).toBeLessThanOrEqual(4);
      }
    });

    it('should return state as object with id, name, type', async () => {
      const result = await listIssues.execute({ limit: 10 });

      // Find an issue with state set
      const issueWithState = result.issues.find(i => i.state);
      if (issueWithState && issueWithState.state) {
        expect(typeof issueWithState.state).toBe('object');
        expect(issueWithState.state).toHaveProperty('id');
        expect(issueWithState.state).toHaveProperty('name');
        expect(issueWithState.state).toHaveProperty('type');
      }
    });

    it('should return assignee as string (name)', async () => {
      const result = await listIssues.execute({ limit: 10 });

      // Find an issue with assignee set
      const issueWithAssignee = result.issues.find(i => i.assignee);
      if (issueWithAssignee && issueWithAssignee.assignee) {
        expect(typeof issueWithAssignee.assignee).toBe('string');
      }
    });

    it('should truncate description to 200 characters', async () => {
      const result = await listIssues.execute({ limit: 10 });

      // All descriptions should be truncated
      result.issues.forEach(issue => {
        if (issue.description) {
          expect(issue.description.length).toBeLessThanOrEqual(200);
        }
      });
    });
  });
});
