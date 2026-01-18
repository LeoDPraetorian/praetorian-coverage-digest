/**
 * Unit Tests for get-issue Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates filtering, token reduction, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  testSecurityScenarios,
  PathTraversalScenarios,
  CommandInjectionScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the GraphQL execution
vi.mock('./graphql-helpers', () => ({
  executeGraphQL: vi.fn(),
}));

// Mock the client creation
vi.mock('./client', () => ({
  createLinearClient: vi.fn(),
}));

// Import the wrapper to test
import { getIssue } from './get-issue';

import { executeGraphQL } from './graphql-helpers';
import { createLinearClient } from './client';

const mockExecuteGraphQL = vi.mocked(executeGraphQL);
const mockCreateLinearClient = vi.mocked(createLinearClient);

describe('getIssue - Unit Tests', () => {
  /**
   * Helper to create GraphQL response format
   */
  function mockGraphQLResponse(issue: Record<string, unknown> | null) {
    return { issue };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock client creation to return mock HTTP client
    mockCreateLinearClient.mockResolvedValue({} as any);
  });

  afterEach(() => {
    // Clear mocks after each test
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Category 1: Wrapper Logic Tests (Mocked)
  // ==========================================================================

  describe('Filtering logic', () => {
    it('should filter response correctly', async () => {
      // Arrange: Mock GraphQL response with verbose data
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1516',
          title: 'Test Issue',
          description: 'A'.repeat(600), // Very long description
          priority: 2,
          priorityLabel: 'High',
          estimate: 3,
          state: { id: 'state-1', name: 'In Progress', type: 'started' },
          assignee: { id: 'user-123', name: 'John Doe', email: 'john@example.com' },
          url: 'https://linear.app/team/issue/CHARIOT-1516',
          branchName: 'feature/chariot-1516',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-26T00:00:00.000Z',
          attachments: { nodes: [{ id: 'att-1', title: 'Screenshot', url: 'https://example.com/img.png' }] },
        },
      });

      // Act: Execute wrapper
      const result = await getIssue.execute({ id: 'CHARIOT-1516' });

      // Assert: Verify filtering applied
      expect(result).toBeDefined();
      expect(result.id).toBe('issue-123');
      expect(result.identifier).toBe('CHARIOT-1516');
      expect(result.title).toBe('Test Issue');
      expect(result.description).toHaveLength(500); // Truncated to 500
      expect(result.priority).toBe(2);
      expect(result.branchName).toBe('feature/chariot-1516');

      // Verify GraphQL was called correctly
      expect(mockExecuteGraphQL).toHaveBeenCalledTimes(1);
      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(), // client
        expect.stringContaining('query Issue'), // query
        { id: 'CHARIOT-1516' }
      );
    });

    it('should truncate long descriptions to 500 characters', async () => {
      // Arrange: Mock response with very long description
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
          description: 'A'.repeat(1000), // 1000 characters
        },
      });

      // Act
      const result = await getIssue.execute({ id: 'CHARIOT-1' });

      // Assert: Verify truncation
      expect(result.description).toHaveLength(500);
      expect(result.description).toBe('A'.repeat(500));
    });

    it('should handle optional fields being null/undefined', async () => {
      // Arrange: Mock response with minimal data
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Minimal Issue',
          // All optional fields omitted
        },
      });

      // Act
      const result = await getIssue.execute({ id: 'CHARIOT-1' });

      // Assert: Verify required fields present, optional fields undefined
      expect(result.id).toBe('issue-123');
      expect(result.identifier).toBe('CHARIOT-1');
      expect(result.title).toBe('Minimal Issue');
      expect(result.description).toBeUndefined();
      expect(result.priority).toBeUndefined();
      expect(result.assignee).toBeUndefined();
      expect(result.state).toBeUndefined();
    });

    it('should extract branchName from branchName field', async () => {
      // Arrange: GraphQL uses branchName directly
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
          branchName: 'feature/test-branch',
        },
      });

      // Act
      const result = await getIssue.execute({ id: 'CHARIOT-1' });

      // Assert: Verify branchName mapped correctly
      expect(result.branchName).toBe('feature/test-branch');
    });

    it('should handle priority as number', async () => {
      // Arrange: Priority is a number
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
          priority: 1,
        },
      });

      // Act
      const result = await getIssue.execute({ id: 'CHARIOT-1' });

      // Assert: Verify priority is a number
      expect(result.priority).toBe(1);
      expect(typeof result.priority).toBe('number');
    });

    it('should handle assignee as object with name', async () => {
      // Arrange: GraphQL returns assignee as object
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
          assignee: { id: 'user-123', name: 'John Doe', email: 'john@example.com' },
        },
      });

      // Act
      const result = await getIssue.execute({ id: 'CHARIOT-1' });

      // Assert: Verify assignee is object
      expect(result.assignee).toBeDefined();
      expect(result.assignee).toHaveProperty('name', 'John Doe');
    });
  });

  describe('Token estimation', () => {
    it('should significantly reduce token count through filtering', async () => {
      // Arrange: Mock verbose GraphQL response with long description
      const verboseResponse = {
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1516',
          title: 'Test Issue',
          description: 'A'.repeat(1000), // Long description that will be truncated
          priority: 2,
          priorityLabel: 'High',
          estimate: 5,
          state: { id: 'state-1', name: 'In Progress', type: 'started' },
          assignee: { id: 'user-123', name: 'John Doe', email: 'john@example.com' },
          url: 'https://linear.app/team/issue/CHARIOT-1516',
          branchName: 'feature/chariot-1516',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-26T00:00:00.000Z',
          attachments: {
            nodes: Array(10).fill({ id: 'att-1', title: 'Screenshot', url: 'https://example.com/img.png' }),
          },
        },
      };

      mockExecuteGraphQL.mockResolvedValueOnce(verboseResponse);

      // Act
      const result = await getIssue.execute({ id: 'CHARIOT-1516' });

      // Assert: Calculate token reduction
      const inputSize = JSON.stringify(verboseResponse).length;
      const outputSize = JSON.stringify(result).length;
      const reduction = ((inputSize - outputSize) / inputSize) * 100;

      console.log(`Token reduction: ${reduction.toFixed(1)}%`);
      console.log(`Input: ${inputSize} chars, Output: ${outputSize} chars`);

      // Should achieve at least 20% reduction (from description truncation and other filtering)
      expect(reduction).toBeGreaterThan(20);
    });
  });

  // ==========================================================================
  // Category 2: Error Handling Tests
  // ==========================================================================

  describe('GraphQL server errors', () => {
    it('should handle rate limit errors', async () => {
      // Arrange: GraphQL throws rate limit error
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('rate limit exceeded'));

      // Act & Assert
      await expect(
        getIssue.execute({ id: 'CHARIOT-1' })
      ).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      // Arrange
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Internal server error'));

      // Act & Assert
      await expect(
        getIssue.execute({ id: 'CHARIOT-1' })
      ).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      // Arrange
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      // Act & Assert
      await expect(
        getIssue.execute({ id: 'CHARIOT-1' })
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should throw when issue not found', async () => {
      // Arrange: GraphQL returns null issue
      mockExecuteGraphQL.mockResolvedValueOnce({ issue: null });

      // Act & Assert
      await expect(
        getIssue.execute({ id: 'NONEXISTENT-999' })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Malformed responses', () => {
    it('should handle response missing required fields', async () => {
      // Arrange: GraphQL returns issue missing identifier and title
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          // Missing identifier and title
        },
      });

      // Act & Assert: Should fail Zod validation
      await expect(
        getIssue.execute({ id: 'CHARIOT-1' })
      ).rejects.toThrow();
    });

    it('should handle unexpected response structure', async () => {
      // Arrange: GraphQL returns completely wrong format
      mockExecuteGraphQL.mockResolvedValueOnce({});

      // Act & Assert: Should fail validation
      await expect(
        getIssue.execute({ id: 'CHARIOT-1' })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 3: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should reject empty issue ID', async () => {
      await expect(
        getIssue.execute({ id: '' })
      ).rejects.toThrow();
    });

    it('should accept valid issue IDs', async () => {
      mockExecuteGraphQL.mockResolvedValue({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
        },
      });

      // Valid IDs should not throw
      await getIssue.execute({ id: 'CHARIOT-1' });
      await getIssue.execute({ id: 'CHARIOT-1516' });
      await getIssue.execute({ id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' });

      expect(mockExecuteGraphQL).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Category 4: Security Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block path traversal attacks', async () => {
      // Wrapper now validates input - malicious inputs should be BLOCKED
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => getIssue.execute({ id: input })
      );

      // All path traversal attempts should be blocked
      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection attacks', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => getIssue.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block control character injection', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => getIssue.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should reject inputs with control characters', async () => {
      // Explicit test for control character blocking (empty test handled in Input validation)
      await expect(
        getIssue.execute({ id: 'test\x00null' })
      ).rejects.toThrow(/control characters/i);
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mockExecuteGraphQL.mockResolvedValue({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
        },
      });

      // Act: Measure execution time
      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await getIssue.execute({ id: 'CHARIOT-1' });
      }

      const avgTime = (Date.now() - start) / iterations;

      // Assert: Average time should be very fast (mocked)
      expect(avgTime).toBeLessThan(10); // <10ms per call
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  // ==========================================================================
  // Category 6: GraphQL Response Format Tests
  // Tests GraphQL response structure and field handling
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard GraphQL response format', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test Issue',
        },
      });

      const result = await getIssue.execute({ id: 'CHARIOT-1' });
      expect(result).toBeDefined();
      expect(result.id).toBe('issue-123');
    });

    it('should handle GraphQL response with all optional fields', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-full',
          identifier: 'CHARIOT-FULL',
          title: 'Full Issue',
          description: 'Full description',
          priority: 2,
          priorityLabel: 'High',
          estimate: 5,
          state: { id: 's1', name: 'In Progress', type: 'started' },
          assignee: { id: 'u1', name: 'John', email: 'john@example.com' },
          url: 'https://linear.app/issue',
          branchName: 'feature/test',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
          attachments: {
            nodes: [{ id: 'a1', title: 'File', url: 'https://example.com/file' }],
          },
        },
      });

      const result = await getIssue.execute({ id: 'CHARIOT-FULL' });
      expect(result).toBeDefined();
      expect(result.identifier).toBe('CHARIOT-FULL');
      expect(result.priority).toBe(2);
      expect(result.state?.name).toBe('In Progress');
      expect(result.assignee?.name).toBe('John');
    });

    it('should handle GraphQL response with minimal fields', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-minimal',
          identifier: 'CHARIOT-MIN',
          title: 'Minimal Issue',
        },
      });

      const result = await getIssue.execute({ id: 'CHARIOT-MIN' });
      expect(result).toBeDefined();
      expect(result.identifier).toBe('CHARIOT-MIN');
      expect(result.description).toBeUndefined();
      expect(result.priority).toBeUndefined();
    });
  });

  // ==========================================================================
  // Category 7: Edge Case Tests
  // Tests boundary conditions and unusual inputs
  // ==========================================================================

  describe('Edge Case Tests', () => {
    it('edge case: should handle null description gracefully', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
          description: null,
        },
      });

      const result = await getIssue.execute({ id: 'CHARIOT-1' });
      expect(result.description).toBeUndefined();
    });

    it('edge case: should handle undefined state', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
          state: undefined,
        },
      });

      const result = await getIssue.execute({ id: 'CHARIOT-1' });
      expect(result.state).toBeUndefined();
    });

    it('edge case: should handle empty attachments array', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test',
          attachments: { nodes: [] },
        },
      });

      const result = await getIssue.execute({ id: 'CHARIOT-1' });
      expect(result.attachments).toEqual([]);
    });

    it('edge case: should handle large dataset (many attachments)', async () => {
      const manyAttachments = Array(100).fill(null).map((_, i) => ({
        id: `att-${i}`,
        title: `Attachment ${i}`,
        url: `https://example.com/att${i}.png`,
      }));

      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: 'Test with many attachments',
          attachments: { nodes: manyAttachments },
        },
      });

      const result = await getIssue.execute({ id: 'CHARIOT-1' });
      expect(result.attachments).toHaveLength(100);
    });

    it('edge case: should handle very long issue identifier', async () => {
      const longId = 'A'.repeat(200);
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: longId,
          title: 'Test',
        },
      });

      const result = await getIssue.execute({ id: longId });
      expect(result.identifier).toBe(longId);
    });

    it('edge case: should handle unicode in title and description', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        issue: {
          id: 'issue-123',
          identifier: 'CHARIOT-1',
          title: '日本語タイトル 🚀 émojis',
          description: 'Description with ü ö ä and 中文',
        },
      });

      const result = await getIssue.execute({ id: 'CHARIOT-1' });
      expect(result.title).toBe('日本語タイトル 🚀 émojis');
      expect(result.description).toBe('Description with ü ö ä and 中文');
    });
  });
});
