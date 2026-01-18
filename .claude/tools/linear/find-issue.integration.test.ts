/**
 * Integration Tests for find-issue Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 * They validate the smart issue finder with disambiguation support.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace with test issues
 *
 * Usage:
 * npx vitest run find-issue.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { findIssue } from './find-issue';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('findIssue - Integration Tests', () => {
  // Test with a known issue identifier
  const TEST_ISSUE_ID = process.env.TEST_ISSUE_ID || 'CHARIOT-1';

  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
    console.log(`Test issue ID: ${TEST_ISSUE_ID}`);
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should find issue by exact identifier', async () => {
    // Act: Call with full identifier
    const result = await findIssue.execute({ query: TEST_ISSUE_ID });

    // Assert: Should find the issue
    expect(result).toBeDefined();
    expect(result.status).toBe('found');

    if (result.status === 'found') {
      expect(result.issue.identifier).toBeDefined();
      expect(result.issue.title).toBeDefined();

      console.log('Found issue:', {
        identifier: result.issue.identifier,
        title: result.issue.title.substring(0, 50),
        state: result.issue.state?.name,
      });
    }
  });

  it('Real MCP Server: should search by text query', async () => {
    // Act: Search with text query
    const result = await findIssue.execute({ query: 'test', maxResults: 3 });

    // Assert: Should return found or disambiguation_needed or not_found
    expect(result).toBeDefined();
    expect(['found', 'disambiguation_needed', 'not_found']).toContain(result.status);

    if (result.status === 'disambiguation_needed') {
      expect(result.candidates.length).toBeGreaterThan(0);
      console.log('Disambiguation candidates:', result.candidates.map(c => c.identifier));
    }
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    // Act
    const result = await findIssue.execute({ query: TEST_ISSUE_ID });

    // Assert: Verify only essential fields in found result
    if (result.status === 'found') {
      const issue = result.issue;
      const keys = Object.keys(issue);
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
      findIssue.execute({ query: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    // Command injection
    await expect(
      findIssue.execute({ query: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    // Control characters
    await expect(
      findIssue.execute({ query: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should return not_found for nonexistent issue', async () => {
    // Act: Search for something that likely doesn't exist
    const result = await findIssue.execute({ query: 'xyznonexistentquery123' });

    // Assert: Should return not_found
    expect(result.status).toBe('not_found');
    if (result.status === 'not_found') {
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    }
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();

    await findIssue.execute({ query: TEST_ISSUE_ID });

    const duration = Date.now() - start;

    // Should complete within 5 seconds (network call + processing)
    expect(duration).toBeLessThan(5000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return priority as number (0-4) in found result', async () => {
      const result = await findIssue.execute({ query: TEST_ISSUE_ID });

      if (result.status === 'found' && result.issue.priority !== undefined && result.issue.priority !== null) {
        expect(typeof result.issue.priority).toBe('number');
        expect(result.issue.priority).toBeGreaterThanOrEqual(0);
        expect(result.issue.priority).toBeLessThanOrEqual(4);
      }
    });

    it('should return state as object with id, name, type', async () => {
      const result = await findIssue.execute({ query: TEST_ISSUE_ID });

      if (result.status === 'found' && result.issue.state) {
        expect(typeof result.issue.state).toBe('object');
        expect(result.issue.state).toHaveProperty('id');
        expect(result.issue.state).toHaveProperty('name');
        expect(result.issue.state).toHaveProperty('type');
      }
    });

    it('should return assignee as string (name) in found result', async () => {
      const result = await findIssue.execute({ query: TEST_ISSUE_ID });

      if (result.status === 'found' && result.issue.assignee) {
        expect(typeof result.issue.assignee).toBe('string');
      }
    });

    it('should return proper disambiguation candidates format', async () => {
      // Search with broad query to get disambiguation
      const result = await findIssue.execute({ query: 'bug', maxResults: 5 });

      if (result.status === 'disambiguation_needed') {
        expect(Array.isArray(result.candidates)).toBe(true);
        result.candidates.forEach(candidate => {
          expect(candidate).toHaveProperty('identifier');
          expect(candidate).toHaveProperty('title');
          expect(typeof candidate.identifier).toBe('string');
          expect(typeof candidate.title).toBe('string');
        });
      }
    });
  });
});
