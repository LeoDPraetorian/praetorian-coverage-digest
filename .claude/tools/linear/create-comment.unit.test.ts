/**
 * Unit Tests for create-comment Wrapper
 *
 * Tests wrapper logic in isolation using mocked GraphQL client.
 * No actual Linear API calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createComment, createCommentParams, createCommentOutput } from './create-comment';
import {
  testSecurityScenarios,
  PathTraversalScenarios,
  CommandInjectionScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the client and GraphQL modules
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn(),
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn(),
}));

import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

describe('createComment - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response (matches commentCreate mutation)
  const sampleGraphQLResponse = {
    commentCreate: {
      success: true,
      comment: {
        id: 'comment-uuid-123',
        body: 'Test comment',
        createdAt: '2024-01-15T10:30:00Z',
      },
    },
  };

  beforeEach(() => {
    vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
    vi.mocked(executeGraphQL).mockResolvedValue(sampleGraphQLResponse as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should require issueId field', () => {
      expect(() => createCommentParams.parse({ body: 'Test comment' })).toThrow();
    });

    it('should require body field', () => {
      expect(() => createCommentParams.parse({ issueId: 'TEST-1' })).toThrow();
    });

    it('should reject empty issueId', () => {
      expect(() => createCommentParams.parse({ issueId: '', body: 'Test' })).toThrow();
    });

    it('should reject empty body', () => {
      expect(() => createCommentParams.parse({ issueId: 'TEST-1', body: '' })).toThrow();
    });

    it('should accept valid input with required fields', () => {
      const input = {
        issueId: 'CHARIOT-1234',
        body: 'This is a test comment',
      };
      const result = createCommentParams.parse(input);
      expect(result.issueId).toBe('CHARIOT-1234');
      expect(result.body).toBe('This is a test comment');
    });

    it('should accept optional parentId for replies', () => {
      const input = {
        issueId: 'TEST-1',
        body: 'Reply to another comment',
        parentId: 'parent-uuid-123',
      };
      const result = createCommentParams.parse(input);
      expect(result.parentId).toBe('parent-uuid-123');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      const result = await createComment.execute({
        issueId: 'CHARIOT-1234',
        body: 'Test comment',
      });

      expect(result.success).toBe(true);
      expect(result.comment.id).toBe('comment-uuid-123');
      expect(result.comment.body).toBe('Test comment');
      expect(result.comment.createdAt).toBe('2024-01-15T10:30:00Z');
    });

    it('should validate output against schema', async () => {
      const result = await createComment.execute({
        issueId: 'TEST-1',
        body: 'Test',
      });
      expect(() => createCommentOutput.parse(result)).not.toThrow();
    });

    it('should include estimatedTokens', async () => {
      const result = await createComment.execute({
        issueId: 'TEST-1',
        body: 'Test',
      });
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw when success is false', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        commentCreate: { success: false, comment: null },
      } as any);

      await expect(
        createComment.execute({ issueId: 'TEST-1', body: 'Test' })
      ).rejects.toThrow(/Failed to create comment/);
    });

    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValue(new Error('Connection failed'));

      await expect(
        createComment.execute({ issueId: 'TEST-1', body: 'Test' })
      ).rejects.toThrow('Connection failed');
    });

    it('should throw on null response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue(null as any);

      await expect(
        createComment.execute({ issueId: 'TEST-1', body: 'Test' })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // MCP Response Format Tests
  // ==========================================================================

  describe('MCP Response Format Tests', () => {
    it('should handle object format from MCP', async () => {
      const result = await createComment.execute({
        issueId: 'TEST-1',
        body: 'Test comment',
      });

      expect(result.success).toBe(true);
      expect(result.comment.id).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle UUID format for issueId', async () => {
      await createComment.execute({
        issueId: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e',
        body: 'Test',
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('commentCreate'),
        expect.objectContaining({
          issueId: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e',
        })
      );
    });

    it('should handle identifier format for issueId', async () => {
      await createComment.execute({
        issueId: 'CHARIOT-1234',
        body: 'Test',
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('commentCreate'),
        expect.objectContaining({
          issueId: 'CHARIOT-1234',
        })
      );
    });

    it('should handle very long comment body', async () => {
      const longBody = 'A'.repeat(10000);
      vi.mocked(executeGraphQL).mockResolvedValue({
        commentCreate: {
          success: true,
          comment: { id: '1', body: longBody, createdAt: '2024-01-01T00:00:00Z' },
        },
      } as any);

      const result = await createComment.execute({
        issueId: 'TEST-1',
        body: longBody,
      });

      expect(result.success).toBe(true);
    });

    it('should handle markdown in body', async () => {
      // Note: Newlines are allowed, but other control chars are blocked
      const markdownBody = '## Header - List item - Another item - code block';

      const result = await createComment.execute({
        issueId: 'TEST-1',
        body: markdownBody,
      });

      expect(result.success).toBe(true);
    });

    it('should handle parentId for threaded replies', async () => {
      await createComment.execute({
        issueId: 'TEST-1',
        body: 'Reply',
        parentId: 'parent-comment-uuid',
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('commentCreate'),
        expect.objectContaining({
          parentId: 'parent-comment-uuid',
        })
      );
    });
  });

  // ==========================================================================
  // Security Tests
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in issueId', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createComment.execute({ issueId: input, body: 'Test' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in issueId', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createComment.execute({ issueId: input, body: 'Test' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in issueId', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createComment.execute({ issueId: input, body: 'Test' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in body', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createComment.execute({ issueId: 'TEST-1', body: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in parentId', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createComment.execute({ issueId: 'TEST-1', body: 'Test', parentId: input })
      );

      expect(results.passed).toBe(results.total);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should complete validation quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        createCommentParams.parse({ issueId: `TEST-${i}`, body: `Comment ${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(createComment.name).toBe('linear.create_comment');
    });

    it('should have description', () => {
      expect(createComment.description).toBeDefined();
    });

    it('should have parameters schema', () => {
      expect(createComment.parameters).toBeDefined();
    });
  });
});
