/**
 * Integration Tests for get-issue Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 * They validate that the wrapper works correctly in production.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Test issue exists (CHARIOT-* format)
 *
 * Usage:
 * npx vitest run get-issue.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getIssue } from './get-issue';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('getIssue - Integration Tests', () => {
  // Test with a known issue identifier
  // Using a generic format that should exist in most Linear workspaces
  const TEST_ISSUE_ID = process.env.TEST_ISSUE_ID || 'CHARIOT-1';

  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
    console.log(`Test issue ID: ${TEST_ISSUE_ID}`);
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should fetch a real issue from Linear', async () => {
    // Act: Call the real MCP server
    const result = await getIssue.execute({ id: TEST_ISSUE_ID });

    // Assert: Verify response structure
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.identifier).toBeDefined();
    expect(result.title).toBeDefined();

    console.log('Fetched issue:', {
      id: result.id,
      identifier: result.identifier,
      title: result.title.substring(0, 50),
      state: result.state?.name,
    });
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    // Act
    const result = await getIssue.execute({ id: TEST_ISSUE_ID });

    // Assert: Verify only essential fields are returned
    const keys = Object.keys(result);
    const allowedKeys = [
      'id', 'identifier', 'title', 'description', 'priority',
      'priorityLabel', 'estimate', 'state', 'assignee', 'assigneeId',
      'url', 'branchName', 'createdAt', 'updatedAt', 'attachments'
    ];

    // All returned keys should be in allowed list
    keys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(result).not.toHaveProperty('metadata');
    expect(result).not.toHaveProperty('history');
    expect(result).not.toHaveProperty('comments');
    expect(result).not.toHaveProperty('labels');
    expect(result).not.toHaveProperty('relations');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should handle non-existent issue gracefully', async () => {
    // Act & Assert: Non-existent issue should throw
    await expect(
      getIssue.execute({ id: 'NONEXISTENT-99999' })
    ).rejects.toThrow();
  });

  it('should validate security constraints on real input', async () => {
    // These should be blocked by input validation BEFORE hitting the API

    // Path traversal
    await expect(
      getIssue.execute({ id: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    // Command injection
    await expect(
      getIssue.execute({ id: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters
    await expect(
      getIssue.execute({ id: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();

    await getIssue.execute({ id: TEST_ISSUE_ID });

    const duration = Date.now() - start;

    // Should complete within 5 seconds (network call + processing)
    expect(duration).toBeLessThan(5000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return priority as number (0-4)', async () => {
      const result = await getIssue.execute({ id: TEST_ISSUE_ID });

      if (result.priority !== undefined && result.priority !== null) {
        expect(typeof result.priority).toBe('number');
        expect(result.priority).toBeGreaterThanOrEqual(0);
        expect(result.priority).toBeLessThanOrEqual(4);
      }
    });

    it('should return state as object with id, name, type', async () => {
      const result = await getIssue.execute({ id: TEST_ISSUE_ID });

      if (result.state) {
        expect(typeof result.state).toBe('object');
        expect(result.state).toHaveProperty('id');
        expect(result.state).toHaveProperty('name');
        expect(result.state).toHaveProperty('type');
      }
    });

    it('should return assignee as string (name)', async () => {
      const result = await getIssue.execute({ id: TEST_ISSUE_ID });

      if (result.assignee) {
        expect(typeof result.assignee).toBe('string');
      }
    });
  });
});
