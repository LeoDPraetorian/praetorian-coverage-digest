/**
 * Unit Tests for list-comments Wrapper
 *
 * These tests validate the list-comments wrapper using MOCKED MCP responses.
 * No actual Linear API calls are made.
 *
 * Test Categories:
 * 1. Input Validation - Zod schema enforcement
 * 2. Token Reduction - Output filtering verification
 * 3. Error Handling - Various failure scenarios
 * 4. Security - Input sanitization and validation
 * 5. Performance - Response time verification
 * 6. MCP Response Formats - Different response structures
 * 7. Edge Cases - Boundary conditions
 *
 * Usage:
 * npx vitest run list-comments.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listComments, listCommentsParams, listCommentsOutput } from './list-comments';
import {
  testSecurityScenarios,
  PathTraversalScenarios,
  CommandInjectionScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the client and GraphQL modules BEFORE importing
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn(),
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn(),
}));

import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

describe('listComments - Unit Tests', () => {
  const mockClient = {};

  beforeEach(() => {
    vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should require issueId field', () => {
      expect(() => listCommentsParams.parse({})).toThrow();
    });

    it('should reject empty issueId', () => {
      expect(() => listCommentsParams.parse({ issueId: '' })).toThrow();
    });

    it('should accept valid issueId', () => {
      const input = { issueId: 'CHARIOT-1234' };
      const result = listCommentsParams.parse(input);
      expect(result.issueId).toBe('CHARIOT-1234');
    });

    it('should accept UUID format', () => {
      const input = { issueId: '550e8400-e29b-41d4-a716-446655440000' };
      const result = listCommentsParams.parse(input);
      expect(result.issueId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {
            nodes: [
              {
                id: 'comment-1',
                body: 'First comment',
                user: { id: 'user-1', name: 'John', email: 'john@example.com' },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                // Extra fields that should be filtered
                reactions: [],
                issue: { id: 'issue-1' },
                children: [],
              },
            ],
          },
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });

      // Verify structure
      expect(result.totalComments).toBe(1);
      expect(result.comments[0]).toHaveProperty('id');
      expect(result.comments[0]).toHaveProperty('body');
      expect(result.comments[0]).toHaveProperty('createdAt');
      expect(result.comments[0]).toHaveProperty('updatedAt');

      // Verify filtered fields are NOT present
      expect(result.comments[0]).not.toHaveProperty('reactions');
      expect(result.comments[0]).not.toHaveProperty('issue');
      expect(result.comments[0]).not.toHaveProperty('children');
    });

    it('should truncate body to 300 characters', async () => {
      const longBody = 'x'.repeat(500);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {
            nodes: [
              {
                id: 'comment-1',
                body: longBody,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            ],
          },
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });

      expect(result.comments[0].body.length).toBe(300);
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {
            nodes: [
              {
                id: 'comment-1',
                body: 'Test',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            ],
          },
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });
      expect(() => listCommentsOutput.parse(result)).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL request failed'));

      await expect(
        listComments.execute({ issueId: 'TEST-1' })
      ).rejects.toThrow('GraphQL request failed');
    });

    it('should handle empty comments array response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {
            nodes: [],
          },
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });

      expect(result.comments).toEqual([]);
      expect(result.totalComments).toBe(0);
    });

    it('should throw on issue not found', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: null,
      } as any);

      await expect(
        listComments.execute({ issueId: 'TEST-1' })
      ).rejects.toThrow(/Issue not found/);
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in issueId', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => listComments.execute({ issueId: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block path traversal in issueId', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => listComments.execute({ issueId: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in issueId', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => listComments.execute({ issueId: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should complete validation within reasonable time', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        listCommentsParams.parse({ issueId: `TEST-${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle multiple comments', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {
            nodes: [
              {
                id: 'comment-1',
                body: 'First',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
              {
                id: 'comment-2',
                body: 'Second',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            ],
          },
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });
      expect(result.totalComments).toBe(2);
      expect(result.comments[0].id).toBe('comment-1');
      expect(result.comments[1].id).toBe('comment-2');
    });

    it('should handle null comments field', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: null,
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });
      expect(result.comments).toEqual([]);
      expect(result.totalComments).toBe(0);
    });

    it('should handle comments without nodes', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {},
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });
      expect(result.comments).toEqual([]);
      expect(result.totalComments).toBe(0);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle comments without user info', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {
            nodes: [
              {
                id: 'comment-1',
                body: 'System comment',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                // No user field
              },
            ],
          },
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });
      expect(result.comments[0].user).toBeUndefined();
    });

    it('should handle large number of comments', async () => {
      const manyComments = Array.from({ length: 100 }, (_, i) => ({
        id: `comment-${i}`,
        body: `Comment ${i}`,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }));
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {
            nodes: manyComments,
          },
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });
      expect(result.totalComments).toBe(100);
      expect(result.comments.length).toBe(100);
    });

    it('should handle special characters in issue identifier', () => {
      const input = { issueId: 'TEAM-SUB-1234' };
      const result = listCommentsParams.parse(input);
      expect(result.issueId).toBe('TEAM-SUB-1234');
    });

    it('should handle comments with partial user info', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          comments: {
            nodes: [
              {
                id: 'comment-1',
                body: 'Test',
                user: { id: 'user-1', name: 'John', email: 'john@test.com' },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            ],
          },
        },
      } as any);

      const result = await listComments.execute({ issueId: 'TEST-1' });
      expect(result.comments[0].user?.name).toBe('John');
      expect(result.comments[0].user?.email).toBe('john@test.com');
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(listComments.name).toBe('linear.list_comments');
    });

    it('should have description', () => {
      expect(listComments.description).toBeDefined();
      expect(typeof listComments.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(listComments.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(listComments.tokenEstimate).toBeDefined();
      expect(listComments.tokenEstimate.reduction).toBe('99%');
    });
  });
});
