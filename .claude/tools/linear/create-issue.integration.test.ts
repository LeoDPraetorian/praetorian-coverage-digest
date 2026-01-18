/**
 * Integration Tests for create-issue Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 * They validate issue creation with real API responses.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace with write permissions
 *
 * Usage:
 * npx vitest run create-issue.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 *
 * WARNING: These tests CREATE REAL ISSUES in Linear.
 * Use a test team/project to avoid polluting production.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createIssue } from './create-issue';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('createIssue - Integration Tests', () => {
  // Test team - use a dedicated test team to avoid polluting production
  const TEST_TEAM = process.env.TEST_TEAM || 'Chariot Team';

  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
    console.log(`Test team: ${TEST_TEAM}`);
    console.log('WARNING: These tests will CREATE REAL ISSUES');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should create issue with minimal fields', async () => {
    // Act: Create issue with only required fields
    const result = await createIssue.execute({
      title: `[TEST] Integration Test - ${new Date().toISOString()}`,
      team: TEST_TEAM,
    });

    // Assert: Should return success with issue details
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.issue.id).toBeDefined();
    expect(result.issue.identifier).toBeDefined();
    expect(result.issue.title).toContain('Integration Test');
    expect(result.issue.url).toContain('linear.app');

    console.log('Created issue:', {
      identifier: result.issue.identifier,
      url: result.issue.url,
    });
  });

  it('Real MCP Server: should create issue with description', async () => {
    // Act: Create issue with markdown description
    const result = await createIssue.execute({
      title: `[TEST] Issue with Description - ${Date.now()}`,
      description: `## Test Issue

This is a **test issue** created by integration tests.

### Details
- Created at: ${new Date().toISOString()}
- Purpose: Validate create-issue wrapper

\`\`\`typescript
const test = true;
\`\`\`
`,
      team: TEST_TEAM,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.issue.identifier).toBeDefined();
  });

  it('Real MCP Server: should create issue with priority', async () => {
    // Act: Create high priority issue
    const result = await createIssue.execute({
      title: `[TEST] High Priority Issue - ${Date.now()}`,
      team: TEST_TEAM,
      priority: 2, // High
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.issue.identifier).toBeDefined();
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    // Act
    const result = await createIssue.execute({
      title: `[TEST] Token Reduction Test - ${Date.now()}`,
      team: TEST_TEAM,
    });

    // Assert: Verify only essential fields in response
    expect(result.success).toBe(true);
    const issue = result.issue;
    const keys = Object.keys(issue);
    const allowedKeys = ['id', 'identifier', 'title', 'url'];

    // All returned keys should be in allowed list
    keys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(issue).not.toHaveProperty('description');
    expect(issue).not.toHaveProperty('priority');
    expect(issue).not.toHaveProperty('state');
    expect(issue).not.toHaveProperty('assignee');
    expect(issue).not.toHaveProperty('createdAt');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    // These should be blocked by input validation BEFORE hitting the API

    // Path traversal in team
    await expect(
      createIssue.execute({ title: 'Test', team: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    // Command injection in team
    await expect(
      createIssue.execute({ title: 'Test', team: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters in title
    await expect(
      createIssue.execute({ title: 'test\x00null', team: TEST_TEAM })
    ).rejects.toThrow(/control characters/i);
  });

  it('should handle invalid team gracefully', async () => {
    // Act & Assert: Invalid team should return descriptive error
    await expect(
      createIssue.execute({
        title: '[TEST] Invalid Team Test',
        team: 'NonExistentTeam12345',
      })
    ).rejects.toThrow();
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();

    await createIssue.execute({
      title: `[TEST] Performance Test - ${Date.now()}`,
      team: TEST_TEAM,
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
      const result = await createIssue.execute({
        title: `[TEST] Schema Test - ${Date.now()}`,
        team: TEST_TEAM,
      });

      // Verify exact structure
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(true);
      expect(typeof result.issue).toBe('object');
      expect(typeof result.issue.id).toBe('string');
      expect(typeof result.issue.identifier).toBe('string');
      expect(typeof result.issue.title).toBe('string');
      expect(typeof result.issue.url).toBe('string');
    });

    it('should return valid Linear URL format', async () => {
      const result = await createIssue.execute({
        title: `[TEST] URL Format Test - ${Date.now()}`,
        team: TEST_TEAM,
      });

      // URL should be a valid Linear issue URL
      expect(result.issue.url).toMatch(/^https:\/\/linear\.app\/.+\/issue\/.+/);
    });

    it('should return identifier matching pattern', async () => {
      const result = await createIssue.execute({
        title: `[TEST] Identifier Test - ${Date.now()}`,
        team: TEST_TEAM,
      });

      // Identifier should match pattern: PREFIX-NUMBER
      expect(result.issue.identifier).toMatch(/^[A-Z]+-\d+$/);
    });
  });
});
