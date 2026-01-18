/**
 * Integration Tests for list-comments Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 * They validate comment listing with real API responses.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace with read permissions
 * - An existing test issue with comments
 *
 * Usage:
 * npx vitest run list-comments.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { listComments } from './list-comments';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('listComments - Integration Tests', () => {
  // Test issue - use an existing test issue that has comments
  const TEST_ISSUE_ID = process.env.TEST_ISSUE_ID || 'CHARIOT-1';

  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
    console.log(`Test issue: ${TEST_ISSUE_ID}`);
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should list comments for issue', async () => {
    // Act
    const result = await listComments.execute({ issueId: TEST_ISSUE_ID });

    // Assert
    expect(result).toBeDefined();
    expect(result.totalComments).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.comments)).toBe(true);

    console.log(`Found ${result.totalComments} comments for ${TEST_ISSUE_ID}`);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    // Act
    const result = await listComments.execute({ issueId: TEST_ISSUE_ID });

    // Assert: Verify only essential fields in response
    if (result.comments.length > 0) {
      const comment = result.comments[0];
      const keys = Object.keys(comment);
      const allowedKeys = ['id', 'body', 'user', 'createdAt', 'updatedAt'];

      // All returned keys should be in allowed list
      keys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });

      // Verbose fields should NOT be present
      expect(comment).not.toHaveProperty('reactions');
      expect(comment).not.toHaveProperty('issue');
      expect(comment).not.toHaveProperty('children');
    }
  });

  it('Token Reduction: should truncate long comment bodies', async () => {
    // Act
    const result = await listComments.execute({ issueId: TEST_ISSUE_ID });

    // Assert: All bodies should be <= 300 chars
    result.comments.forEach(comment => {
      expect(comment.body.length).toBeLessThanOrEqual(300);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    // These should be blocked by input validation BEFORE hitting the API

    // Path traversal in issueId
    await expect(
      listComments.execute({ issueId: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    // Command injection in issueId
    await expect(
      listComments.execute({ issueId: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters in issueId
    await expect(
      listComments.execute({ issueId: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should handle invalid issue ID gracefully', async () => {
    // Note: Linear MCP may return empty array for non-existent issues
    // or may throw - depends on implementation
    try {
      const result = await listComments.execute({ issueId: 'NONEXISTENT-99999' });
      // If it doesn't throw, should return empty comments
      expect(result.comments).toEqual([]);
      expect(result.totalComments).toBe(0);
    } catch (error) {
      // If it throws, that's also acceptable behavior
      expect(error).toBeDefined();
    }
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();

    await listComments.execute({ issueId: TEST_ISSUE_ID });

    const duration = Date.now() - start;

    // Should complete within 10 seconds (network call + processing)
    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await listComments.execute({ issueId: TEST_ISSUE_ID });

      // Verify structure
      expect(typeof result.totalComments).toBe('number');
      expect(Array.isArray(result.comments)).toBe(true);

      if (result.comments.length > 0) {
        const comment = result.comments[0];
        expect(typeof comment.id).toBe('string');
        expect(typeof comment.body).toBe('string');
        expect(typeof comment.createdAt).toBe('string');
        expect(typeof comment.updatedAt).toBe('string');
      }
    });

    it('should return valid ISO timestamps', async () => {
      const result = await listComments.execute({ issueId: TEST_ISSUE_ID });

      result.comments.forEach(comment => {
        const createdDate = new Date(comment.createdAt);
        const updatedDate = new Date(comment.updatedAt);
        expect(createdDate.getTime()).not.toBeNaN();
        expect(updatedDate.getTime()).not.toBeNaN();
      });
    });

    it('should return UUID format for comment ids', async () => {
      const result = await listComments.execute({ issueId: TEST_ISSUE_ID });

      result.comments.forEach(comment => {
        // UUID format (36 chars with hyphens)
        expect(comment.id).toMatch(/^[a-f0-9-]{36}$/i);
      });
    });
  });
});
