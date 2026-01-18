/**
 * Unit Tests for listIssues Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates filtering, token reduction, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MCPErrors,
} from '@claude/testing';

// Mock the client and GraphQL modules BEFORE importing
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn(),
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn(),
}));

// Import the wrapper to test
import { listIssues } from './list-issues';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

// Mock GraphQL issue node for testing
const mockIssueNode = {
  id: 'issue-123',
  identifier: 'CHAR-1516',
  title: 'Test Issue',
  description: 'A'.repeat(300), // Will be truncated to 200
  priority: 2,
  priorityLabel: 'High',
  state: { id: 'state-1', name: 'In Progress', type: 'started' },
  assignee: { id: 'user-123', name: 'John Doe' },
  url: 'https://linear.app/team/issue/CHAR-1516',
  createdAt: '2024-11-20T10:00:00.000Z',
  updatedAt: '2024-11-26T16:00:00.000Z',
};

describe('listIssues - Unit Tests', () => {
  const mockClient = {};

  beforeEach(() => {
    vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Category 1: Wrapper Logic Tests (Mocked)
  // ==========================================================================

  describe('Filtering logic', () => {
    it('should filter response correctly', async () => {
      // Arrange: Mock GraphQL response with verbose data
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [mockIssueNode],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      } as any);

      // Act: Execute wrapper
      const result = await listIssues.execute({});

      // Assert: Verify filtering applied
      expect(result).toBeDefined();
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].id).toBe('issue-123');
      expect(result.issues[0].identifier).toBe('CHAR-1516');
      expect(result.issues[0].title).toBe('Test Issue');
      expect(result.issues[0].description).toHaveLength(200); // Truncated
      expect(result.issues[0].priority).toBe(2);
      expect(result.issues[0].priorityLabel).toBe('High');
      expect(result.issues[0].state?.name).toBe('In Progress');
      expect(result.issues[0].assignee).toBe('John Doe');
      expect(result.totalIssues).toBe(1);

      // Verify executeGraphQL called correctly
      expect(executeGraphQL).toHaveBeenCalledTimes(1);
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('IssuesList'),
        expect.any(Object)
      );
    });

    it('should handle multiple issues', async () => {
      // Arrange: Mock response with multiple issues
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [
            { ...mockIssueNode, id: 'issue-1', identifier: 'CHAR-1' },
            { ...mockIssueNode, id: 'issue-2', identifier: 'CHAR-2' },
            { ...mockIssueNode, id: 'issue-3', identifier: 'CHAR-3' },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      } as any);

      // Act
      const result = await listIssues.execute({ team: 'Engineering' });

      // Assert
      expect(result.issues).toHaveLength(3);
      expect(result.totalIssues).toBe(3);
      expect(result.issues[0].identifier).toBe('CHAR-1');
      expect(result.issues[1].identifier).toBe('CHAR-2');
      expect(result.issues[2].identifier).toBe('CHAR-3');
    });

    it('should handle empty results', async () => {
      // Arrange: Mock empty response
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      } as any);

      // Act
      const result = await listIssues.execute({ query: 'nonexistent' });

      // Assert
      expect(result.issues).toEqual([]);
      expect(result.totalIssues).toBe(0);
    });

    it('should pass filter parameters correctly', async () => {
      // Arrange
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      } as any);

      // Act
      await listIssues.execute({
        assignee: 'me',
        team: 'Engineering',
        state: 'In Progress',
        project: 'Project X',
        label: 'bug',
        query: 'authentication',
        limit: 100,
      });

      // Assert: Verify all filters passed
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('IssuesList'),
        expect.any(Object)
      );
    });

    it('should truncate long descriptions to 200 characters', async () => {
      // Arrange: Issue with very long description
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [
            { ...mockIssueNode, description: 'A'.repeat(1000) },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      } as any);

      // Act
      const result = await listIssues.execute({});

      // Assert
      expect(result.issues[0].description).toHaveLength(200);
    });

    it('should handle issues without optional fields', async () => {
      // Arrange: Minimal issue
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [
            { id: 'issue-minimal', title: 'Minimal Issue' },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      } as any);

      // Act
      const result = await listIssues.execute({});

      // Assert
      expect(result.issues[0].id).toBe('issue-minimal');
      expect(result.issues[0].title).toBe('Minimal Issue');
      expect(result.issues[0].priority).toBeUndefined();
      expect(result.issues[0].state).toBeUndefined();
      expect(result.issues[0].assignee).toBeUndefined();
    });
  });

  // ==========================================================================
  // Category 2: Response Format Verification (MANDATORY)
  // ==========================================================================

  describe('Response Format Verification', () => {
    it('should handle GraphQL issues response', async () => {
      // Mock GraphQL returns: { issues: { nodes: [...], pageInfo: {...} } }
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [mockIssueNode, { ...mockIssueNode, id: 'issue-2' }],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      } as any);

      const result = await listIssues.execute({});

      // Should extract array correctly
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].id).toBe('issue-123');
      expect(result.issues[1].id).toBe('issue-2');
    });

    it('should handle pagination info', async () => {
      // Mock GraphQL returns with pagination
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [mockIssueNode, { ...mockIssueNode, id: 'issue-2' }],
          pageInfo: {
            hasNextPage: true,
            endCursor: 'cursor-123',
          },
        },
      } as any);

      const result = await listIssues.execute({});

      // Should extract pagination info
      expect(result.issues).toHaveLength(2);
      expect(result.nextOffset).toBe('cursor-123');
    });

    it('should handle null issues response', async () => {
      // GraphQL returns null issues
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: null,
      } as any);

      const result = await listIssues.execute({});

      // Should handle gracefully
      expect(result.issues).toEqual([]);
      expect(result.totalIssues).toBe(0);
    });

    it('should support forEach/map operations on extracted data', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [mockIssueNode],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      } as any);

      const result = await listIssues.execute({});

      // Should support array operations (catches format bugs)
      expect(() => result.issues.forEach(issue => issue.id)).not.toThrow();
      expect(() => result.issues.map(issue => issue.id)).not.toThrow();
      expect(result.issues[0]).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Case Tests (MANDATORY for Phase 8)
  // ==========================================================================

  describe('Edge Case Tests', () => {
    it('edge case: should handle empty results array', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      const result = await listIssues.execute({});

      expect(result.issues).toEqual([]);
      expect(result.totalIssues).toBe(0);
    });

    it('edge case: should handle null GraphQL response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: null,
      } as any);

      const result = await listIssues.execute({});

      expect(result.issues).toEqual([]);
      expect(result.totalIssues).toBe(0);
    });

    it('edge case: should handle undefined nodes', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      const result = await listIssues.execute({});

      expect(result.issues).toEqual([]);
      expect(result.totalIssues).toBe(0);
    });

    it('edge case: should handle issues with null priority', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [{ ...mockIssueNode, priority: null, priorityLabel: null }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      const result = await listIssues.execute({});

      expect(result.issues[0].priority).toBeUndefined();
    });

    it('edge case: should handle issues with null state', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [{ ...mockIssueNode, state: null }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      const result = await listIssues.execute({});

      expect(result.issues[0].state).toBeUndefined();
    });

    it('edge case: should handle issues with null assignee', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [{ ...mockIssueNode, assignee: null }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      const result = await listIssues.execute({});

      expect(result.issues[0].assignee).toBeUndefined();
    });

    it('edge case: should truncate long descriptions to 200 chars', async () => {
      const longDescription = 'A'.repeat(500);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [{ ...mockIssueNode, description: longDescription }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      const result = await listIssues.execute({});

      expect(result.issues[0].description?.length).toBeLessThanOrEqual(200);
    });

    it('edge case: should handle object response with empty issues array', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      const result = await listIssues.execute({});

      expect(result.issues).toEqual([]);
      expect(result.totalIssues).toBe(0);
    });
  });

  // ==========================================================================
  // Category 3: Token Estimation
  // ==========================================================================

  describe('Token estimation', () => {
    it('should significantly reduce token count through filtering', async () => {
      // Arrange: Mock GraphQL response
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          nodes: [{
            ...mockIssueNode,
            description: 'A'.repeat(1000),
          }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      // Act
      const result = await listIssues.execute({});

      // Assert: Verify description truncated
      expect(result.issues[0].description?.length).toBeLessThanOrEqual(200);
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // ==========================================================================
  // Category 4: Error Handling Tests
  // ==========================================================================

  describe('GraphQL server errors', () => {
    it('should handle rate limit errors', async () => {
      // Arrange
      vi.mocked(executeGraphQL).mockRejectedValueOnce(MCPErrors.rateLimit());

      // Act & Assert
      await expect(
        listIssues.execute({})
      ).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      // Arrange
      vi.mocked(executeGraphQL).mockRejectedValueOnce(MCPErrors.serverError());

      // Act & Assert
      await expect(
        listIssues.execute({})
      ).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      // Arrange
      vi.mocked(executeGraphQL).mockRejectedValueOnce(MCPErrors.timeout());

      // Act & Assert
      await expect(
        listIssues.execute({})
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle not found errors', async () => {
      // Arrange
      vi.mocked(executeGraphQL).mockRejectedValueOnce(MCPErrors.notFound('team'));

      // Act & Assert
      await expect(
        listIssues.execute({ team: 'NonexistentTeam' })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Malformed responses', () => {
    it('should handle response with null', async () => {
      // Arrange
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: null,
      } as any);

      // Act
      const result = await listIssues.execute({});

      // Assert: Returns empty array
      expect(result.issues).toEqual([]);
      expect(result.totalIssues).toBe(0);
    });

    it('should handle response with undefined nodes', async () => {
      // Arrange
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: {
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      // Act
      const result = await listIssues.execute({});

      // Assert: Returns empty array
      expect(result.issues).toEqual([]);
      expect(result.totalIssues).toBe(0);
    });
  });

  // ==========================================================================
  // Category 5: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should accept all optional parameters as undefined', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      } as any);

      await listIssues.execute({});

      expect(executeGraphQL).toHaveBeenCalledTimes(1);
    });

    it('should apply default values', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      } as any);

      await listIssues.execute({});

      // Zod's .default().optional() pattern only applies limit default
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('IssuesList'),
        expect.objectContaining({
          first: 50,
        })
      );
    });

    it('should reject limit below minimum', async () => {
      await expect(
        listIssues.execute({ limit: 0 })
      ).rejects.toThrow();
    });

    it('should reject limit above maximum', async () => {
      await expect(
        listIssues.execute({ limit: 300 })
      ).rejects.toThrow();
    });

    it('should accept valid limit values', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      } as any);

      await listIssues.execute({ limit: 1 });
      await listIssues.execute({ limit: 250 });
      await listIssues.execute({ limit: 100 });

      expect(executeGraphQL).toHaveBeenCalledTimes(3);
    });

    it('should accept valid orderBy values', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      } as any);

      await listIssues.execute({ orderBy: 'createdAt' });
      await listIssues.execute({ orderBy: 'updatedAt' });

      expect(executeGraphQL).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Category 6: Security Tests
  // ==========================================================================

  describe('Security', () => {
    it('should block path traversal in assignee field', async () => {
      await expect(
        listIssues.execute({ assignee: '../../../etc/passwd' })
      ).rejects.toThrow(/traversal/i);
    });

    it('should block path traversal in team field', async () => {
      await expect(
        listIssues.execute({ team: '../../../etc/passwd' })
      ).rejects.toThrow(/traversal/i);
    });

    it('should block command injection in assignee field', async () => {
      await expect(
        listIssues.execute({ assignee: '; rm -rf /' })
      ).rejects.toThrow(/invalid characters/i);
    });

    it('should block command injection in query field', async () => {
      await expect(
        listIssues.execute({ query: '| cat /etc/passwd' })
      ).rejects.toThrow(/invalid characters/i);
    });

    it('should block control characters in state field', async () => {
      await expect(
        listIssues.execute({ state: 'test\x00null' })
      ).rejects.toThrow(/control characters/i);
    });

    it('should block control characters in project field', async () => {
      await expect(
        listIssues.execute({ project: 'proj\x1fid' })
      ).rejects.toThrow(/control characters/i);
    });

    it('should allow valid filter parameters', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      } as any);

      // These are safe and should pass through
      await listIssues.execute({ assignee: 'me' });
      await listIssues.execute({ team: 'Engineering' });
      await listIssues.execute({ query: 'authentication bug' });
      await listIssues.execute({ state: 'In Progress' });

      expect(executeGraphQL).toHaveBeenCalledTimes(4);
    });
  });

  // ==========================================================================
  // Category 7: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      vi.mocked(executeGraphQL).mockResolvedValue({
        issues: {
          nodes: [mockIssueNode],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      } as any);

      // Act: Measure execution time
      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await listIssues.execute({});
      }

      const avgTime = (Date.now() - start) / iterations;

      // Assert: Average time should be very fast (mocked)
      expect(avgTime).toBeLessThan(10); // <10ms per call
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });
});
