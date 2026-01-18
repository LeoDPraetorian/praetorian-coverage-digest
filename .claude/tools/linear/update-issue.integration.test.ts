/**
 * Integration Tests for update-issue Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 * They validate issue updates with real API responses.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace with write permissions
 * - An existing test issue to update
 *
 * Usage:
 * npx vitest run update-issue.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 *
 * WARNING: These tests UPDATE REAL ISSUES in Linear.
 * Use a test issue to avoid modifying production data.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { updateIssue } from './update-issue';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('updateIssue - Integration Tests', () => {
  // Test issue - use an existing test issue in your workspace
  // This should be an issue that can be safely modified
  const TEST_ISSUE_ID = process.env.TEST_ISSUE_ID || 'CHARIOT-1';

  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
    console.log(`Test issue: ${TEST_ISSUE_ID}`);
    console.log('WARNING: These tests will UPDATE REAL ISSUES');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should update issue title', async () => {
    // Act: Update issue title
    const timestamp = new Date().toISOString();
    const result = await updateIssue.execute({
      id: TEST_ISSUE_ID,
      title: `[TEST] Integration Test Updated - ${timestamp}`,
    });

    // Assert: Should return flattened issue details
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.identifier).toBeDefined();
    expect(result.title).toContain('Integration Test Updated');
    expect(result.url).toContain('linear.app');
    expect(result.estimatedTokens).toBeDefined();

    console.log('Updated issue:', {
      identifier: result.identifier,
      title: result.title,
      url: result.url,
    });
  });

  it('Real MCP Server: should update issue priority', async () => {
    // Act: Update priority to High (2)
    const result = await updateIssue.execute({
      id: TEST_ISSUE_ID,
      priority: 2,
    });

    // Assert
    expect(result.id).toBeDefined();
    expect(result.identifier).toBeDefined();
  });

  it('Real MCP Server: should update issue state', async () => {
    // Act: Update state to In Progress
    const result = await updateIssue.execute({
      id: TEST_ISSUE_ID,
      state: 'In Progress',
    });

    // Assert
    expect(result.id).toBeDefined();
    expect(result.identifier).toBeDefined();
  });

  it('Real MCP Server: should update assignee to me', async () => {
    // Act: Assign to current user
    const result = await updateIssue.execute({
      id: TEST_ISSUE_ID,
      assignee: 'me',
    });

    // Assert
    expect(result.id).toBeDefined();
    expect(result.identifier).toBeDefined();
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    // Act
    const result = await updateIssue.execute({
      id: TEST_ISSUE_ID,
      title: `[TEST] Token Reduction Test - ${Date.now()}`,
    });

    // Assert: Verify only essential fields in response (flattened structure)
    expect(result.id).toBeDefined();
    expect(result.identifier).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.estimatedTokens).toBeDefined();

    const keys = Object.keys(result);
    const allowedKeys = ['id', 'identifier', 'title', 'url', 'estimatedTokens'];

    // All returned keys should be in allowed list
    keys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(result).not.toHaveProperty('description');
    expect(result).not.toHaveProperty('priority');
    expect(result).not.toHaveProperty('state');
    expect(result).not.toHaveProperty('assignee');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    // These should be blocked by input validation BEFORE hitting the API

    // Path traversal in id
    await expect(
      updateIssue.execute({ id: '../../../etc/passwd', title: 'Test' })
    ).rejects.toThrow(/traversal/i);

    // Command injection in id
    await expect(
      updateIssue.execute({ id: '; rm -rf /', title: 'Test' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters in title
    await expect(
      updateIssue.execute({ id: TEST_ISSUE_ID, title: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should handle invalid issue ID gracefully', async () => {
    // Act & Assert: Invalid issue should return descriptive error
    await expect(
      updateIssue.execute({
        id: 'NONEXISTENT-99999',
        title: '[TEST] Invalid Issue Test',
      })
    ).rejects.toThrow();
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();

    await updateIssue.execute({
      id: TEST_ISSUE_ID,
      title: `[TEST] Performance Test - ${Date.now()}`,
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
      const result = await updateIssue.execute({
        id: TEST_ISSUE_ID,
        title: `[TEST] Schema Test - ${Date.now()}`,
      });

      // Verify exact structure (flattened response)
      expect(typeof result.id).toBe('string');
      expect(typeof result.identifier).toBe('string');
      expect(typeof result.title).toBe('string');
      expect(typeof result.url).toBe('string');
      expect(typeof result.estimatedTokens).toBe('number');
    });

    it('should return valid Linear URL format', async () => {
      const result = await updateIssue.execute({
        id: TEST_ISSUE_ID,
        title: `[TEST] URL Format Test - ${Date.now()}`,
      });

      // URL should be a valid Linear issue URL
      expect(result.url).toMatch(/^https:\/\/linear\.app\/.+\/issue\/.+/);
    });

    it('should return identifier matching pattern', async () => {
      const result = await updateIssue.execute({
        id: TEST_ISSUE_ID,
        title: `[TEST] Identifier Test - ${Date.now()}`,
      });

      // Identifier should match pattern: PREFIX-NUMBER
      expect(result.identifier).toMatch(/^[A-Z]+-\d+$/);
    });
  });

  // ==========================================================================
  // Multiple Field Update Tests
  // ==========================================================================

  describe('Multiple Field Updates', () => {
    it('should update multiple fields at once', async () => {
      const result = await updateIssue.execute({
        id: TEST_ISSUE_ID,
        title: `[TEST] Multi-field Update - ${Date.now()}`,
        priority: 3, // Normal
        state: 'Backlog',
      });

      expect(result.id).toBeDefined();
      expect(result.identifier).toBeDefined();
    });

    it('should update issue with due date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dueDate = futureDate.toISOString().split('T')[0];

      const result = await updateIssue.execute({
        id: TEST_ISSUE_ID,
        dueDate,
      });

      expect(result.id).toBeDefined();
      expect(result.identifier).toBeDefined();
    });
  });
});
