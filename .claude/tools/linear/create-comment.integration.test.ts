/**
 * Integration Tests for create-comment Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 * They validate comment creation with real API responses.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace with write permissions
 * - An existing test issue to comment on
 *
 * Usage:
 * npx vitest run create-comment.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 *
 * WARNING: These tests CREATE REAL COMMENTS in Linear.
 * Use a test issue to avoid polluting production.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createComment } from './create-comment';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('createComment - Integration Tests', () => {
  // Test issue - use an existing test issue in your workspace
  const TEST_ISSUE_ID = process.env.TEST_ISSUE_ID || 'CHARIOT-1';

  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
    console.log(`Test issue: ${TEST_ISSUE_ID}`);
    console.log('WARNING: These tests will CREATE REAL COMMENTS');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should create comment with minimal fields', async () => {
    // Act: Create comment with only required fields
    const result = await createComment.execute({
      issueId: TEST_ISSUE_ID,
      body: `[TEST] Integration Test Comment - ${new Date().toISOString()}`,
    });

    // Assert: Should return success with comment details
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.comment.id).toBeDefined();
    expect(result.comment.body).toContain('Integration Test Comment');
    expect(result.comment.createdAt).toBeDefined();

    console.log('Created comment:', {
      id: result.comment.id,
      body: result.comment.body.substring(0, 50) + '...',
    });
  });

  it('Real MCP Server: should create comment with Markdown', async () => {
    // Act: Create comment with markdown formatting
    const result = await createComment.execute({
      issueId: TEST_ISSUE_ID,
      body: `## Test Comment

This is a **bold** comment with \`inline code\`.

- Item 1
- Item 2

Created at: ${new Date().toISOString()}`,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.comment.id).toBeDefined();
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    // Act
    const result = await createComment.execute({
      issueId: TEST_ISSUE_ID,
      body: `[TEST] Token Reduction Test - ${Date.now()}`,
    });

    // Assert: Verify only essential fields in response
    expect(result.success).toBe(true);
    const comment = result.comment;
    const keys = Object.keys(comment);
    const allowedKeys = ['id', 'body', 'createdAt'];

    // All returned keys should be in allowed list
    keys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(comment).not.toHaveProperty('user');
    expect(comment).not.toHaveProperty('issue');
    expect(comment).not.toHaveProperty('updatedAt');
    expect(comment).not.toHaveProperty('reactions');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    // These should be blocked by input validation BEFORE hitting the API

    // Path traversal in issueId
    await expect(
      createComment.execute({ issueId: '../../../etc/passwd', body: 'Test' })
    ).rejects.toThrow(/traversal/i);

    // Command injection in issueId
    await expect(
      createComment.execute({ issueId: '; rm -rf /', body: 'Test' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters in body
    await expect(
      createComment.execute({ issueId: TEST_ISSUE_ID, body: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should handle invalid issue ID gracefully', async () => {
    // Act & Assert: Invalid issue should return descriptive error
    await expect(
      createComment.execute({
        issueId: 'NONEXISTENT-99999',
        body: '[TEST] Invalid Issue Test',
      })
    ).rejects.toThrow();
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();

    await createComment.execute({
      issueId: TEST_ISSUE_ID,
      body: `[TEST] Performance Test - ${Date.now()}`,
    });

    const duration = Date.now() - start;

    // Should complete within 10 seconds (network call + processing)
    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper success response structure', async () => {
      const result = await createComment.execute({
        issueId: TEST_ISSUE_ID,
        body: `[TEST] Schema Test - ${Date.now()}`,
      });

      // Verify exact structure
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(true);
      expect(typeof result.comment).toBe('object');
      expect(typeof result.comment.id).toBe('string');
      expect(typeof result.comment.body).toBe('string');
      expect(typeof result.comment.createdAt).toBe('string');
    });

    it('should return valid ISO timestamp', async () => {
      const result = await createComment.execute({
        issueId: TEST_ISSUE_ID,
        body: `[TEST] Timestamp Test - ${Date.now()}`,
      });

      // createdAt should be a valid ISO timestamp
      const date = new Date(result.comment.createdAt);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should return UUID format for comment id', async () => {
      const result = await createComment.execute({
        issueId: TEST_ISSUE_ID,
        body: `[TEST] UUID Test - ${Date.now()}`,
      });

      // ID should be a UUID (36 chars with hyphens)
      expect(result.comment.id).toMatch(/^[a-f0-9-]{36}$/i);
    });
  });
});
