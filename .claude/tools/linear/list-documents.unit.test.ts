/**
 * Unit Tests for list-documents Wrapper
 *
 * These tests validate the list-documents wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run list-documents.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listDocuments, listDocumentsParams, listDocumentsOutput } from './list-documents';
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

import { executeGraphQL } from './graphql-helpers';
import { createLinearClient } from './client';

const mockExecuteGraphQL = vi.mocked(executeGraphQL);
const mockCreateLinearClient = vi.mocked(createLinearClient);

describe('listDocuments - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock client creation to return mock HTTP client
    mockCreateLinearClient.mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should accept empty input (all fields optional)', () => {
      const input = {};
      const result = listDocumentsParams.parse(input);
      expect(result.limit).toBe(50); // Default value
    });

    it('should accept valid project filter', () => {
      const input = { project: 'proj-uuid-123' };
      const result = listDocumentsParams.parse(input);
      expect(result.project).toBe('proj-uuid-123');
    });

    it('should accept valid initiative filter', () => {
      const input = { initiative: 'init-uuid-456' };
      const result = listDocumentsParams.parse(input);
      expect(result.initiative).toBe('init-uuid-456');
    });

    it('should accept valid limit', () => {
      const input = { limit: 25 };
      const result = listDocumentsParams.parse(input);
      expect(result.limit).toBe(25);
    });

    it('should use default limit of 50', () => {
      const input = {};
      const result = listDocumentsParams.parse(input);
      expect(result.limit).toBe(50);
    });

    it('should reject limit below 1', () => {
      expect(() => listDocumentsParams.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit above 250', () => {
      expect(() => listDocumentsParams.parse({ limit: 251 })).toThrow();
    });

    it('should accept limit at boundary (1)', () => {
      const input = { limit: 1 };
      const result = listDocumentsParams.parse(input);
      expect(result.limit).toBe(1);
    });

    it('should accept limit at boundary (250)', () => {
      const input = { limit: 250 };
      const result = listDocumentsParams.parse(input);
      expect(result.limit).toBe(250);
    });

    it('should accept all filters together', () => {
      const input = { project: 'proj-123', initiative: 'init-456', limit: 100 };
      const result = listDocumentsParams.parse(input);
      expect(result.project).toBe('proj-123');
      expect(result.initiative).toBe('init-456');
      expect(result.limit).toBe(100);
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid-1',
              title: 'Document 1',
              content: 'Full content here that is very long...'.repeat(20),
              slugId: 'document-1',
              url: 'https://linear.app/team/doc/document-1',
              createdAt: '2025-01-25T00:00:00Z',
              updatedAt: '2025-01-25T01:00:00Z',
              // Extra fields that should be filtered
              project: { id: 'proj-1', name: 'Project A' },
              creator: { id: 'user-1', name: 'John' },
            },
            {
              id: 'doc-uuid-2',
              title: 'Document 2',
              content: 'Another document with content',
              url: 'https://linear.app/team/doc/document-2',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});

      // Verify document count
      expect(result.documents).toHaveLength(2);
      expect(result.totalDocuments).toBe(2);

      // Verify essential fields present
      expect(result.documents[0].id).toBe('doc-uuid-1');
      expect(result.documents[0].title).toBe('Document 1');
      expect(result.documents[0].slugId).toBe('document-1');
      expect(result.documents[0].url).toBe('https://linear.app/team/doc/document-1');

      // Verify filtered fields NOT present
      expect(result.documents[0]).not.toHaveProperty('project');
      expect(result.documents[0]).not.toHaveProperty('creator');
    });

    it('should truncate content to 200 characters', async () => {
      const longContent = 'A'.repeat(500);
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid',
              title: 'Document',
              content: longContent,
              url: 'https://linear.app/doc',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents[0].content).toBeDefined();
      expect(result.documents[0].content!.length).toBe(200);
      expect(result.documents[0].content).toBe(longContent.substring(0, 200));
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid',
              title: 'Document',
              url: 'https://linear.app/doc',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // ==========================================================================
  // Filtering Logic Tests
  // ==========================================================================

  describe('Filtering Logic', () => {
    it('should build filter for project', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [],
        },
      });

      await listDocuments.execute({ project: 'proj-123' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          filter: {
            project: { id: { eq: 'proj-123' } },
          },
        })
      );
    });

    it('should build filter for initiative', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [],
        },
      });

      await listDocuments.execute({ initiative: 'init-456' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          filter: {
            initiative: { id: { eq: 'init-456' } },
          },
        })
      );
    });

    it('should combine multiple filters', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [],
        },
      });

      await listDocuments.execute({ project: 'proj-123', initiative: 'init-456' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          filter: {
            project: { id: { eq: 'proj-123' } },
            initiative: { id: { eq: 'init-456' } },
          },
        })
      );
    });

    it('should not include filter when no filters provided', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [],
        },
      });

      await listDocuments.execute({});

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.not.objectContaining({
          filter: expect.anything(),
        })
      );
    });

    it('should use limit parameter correctly', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [],
        },
      });

      await listDocuments.execute({ limit: 100 });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          first: 100,
        })
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle GraphQL rate limit errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce({
        message: 'Rate limit exceeded',
        extensions: { code: 'RATE_LIMITED' },
      });

      await expect(listDocuments.execute({})).rejects.toThrow();
    });

    it('should handle GraphQL server errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(listDocuments.execute({})).rejects.toThrow(/Internal server error/);
    });

    it('should handle GraphQL timeout errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(listDocuments.execute({})).rejects.toThrow(/Request timeout/);
    });

    it('should handle empty results gracefully', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents).toEqual([]);
      expect(result.totalDocuments).toBe(0);
    });

    it('should handle null content in results', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid',
              title: 'Test',
              content: null,
              url: 'https://linear.app/doc',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents[0].content).toBeUndefined();
    });

    it('should handle invalid project ID', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce({
        message: 'GraphQL error:\nProject not found',
      });

      await expect(listDocuments.execute({ project: 'invalid-id' })).rejects.toThrow(
        /GraphQL error/
      );
    });

    it('should handle invalid initiative ID', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce({
        message: 'GraphQL error:\nInitiative not found',
      });

      await expect(listDocuments.execute({ initiative: 'invalid-id' })).rejects.toThrow(
        /GraphQL error/
      );
    });
  });

  // ==========================================================================
  // Security Tests
  // ==========================================================================

  describe('Security - Control Characters', () => {
    it('should block null byte in project ID', () => {
      expect(() => listDocumentsParams.parse({ project: 'proj\x00-123' })).toThrow(
        /Control characters/
      );
    });

    it('should block null byte in initiative ID', () => {
      expect(() => listDocumentsParams.parse({ initiative: 'init\x00-456' })).toThrow(
        /Control characters/
      );
    });

    it('should block bell character in project ID', () => {
      expect(() => listDocumentsParams.parse({ project: 'proj\x07-123' })).toThrow(
        /Control characters/
      );
    });

    it('should block escape sequence in initiative ID', () => {
      expect(() => listDocumentsParams.parse({ initiative: 'init\x1B[31m-456' })).toThrow(
        /Control characters/
      );
    });
  });

  describe('Security - Path Traversal', () => {
    testSecurityScenarios(
      'project',
      (value: string) => listDocumentsParams.parse({ project: value }),
      PathTraversalScenarios
    );

    testSecurityScenarios(
      'initiative',
      (value: string) => listDocumentsParams.parse({ initiative: value }),
      PathTraversalScenarios
    );
  });

  describe('Security - Command Injection', () => {
    testSecurityScenarios(
      'project',
      (value: string) => listDocumentsParams.parse({ project: value }),
      CommandInjectionScenarios
    );

    testSecurityScenarios(
      'initiative',
      (value: string) => listDocumentsParams.parse({ initiative: value }),
      CommandInjectionScenarios
    );
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle single document result', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid',
              title: 'Single Document',
              url: 'https://linear.app/doc',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents).toHaveLength(1);
      expect(result.totalDocuments).toBe(1);
    });

    it('should handle maximum results (250)', async () => {
      const docs = Array.from({ length: 250 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i}`,
        url: `https://linear.app/doc-${i}`,
      }));

      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: docs,
        },
      });

      const result = await listDocuments.execute({ limit: 250 });
      expect(result.documents).toHaveLength(250);
      expect(result.totalDocuments).toBe(250);
    });

    it('should handle null optional fields in documents', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid',
              title: 'Test',
              content: null,
              slugId: null,
              url: 'https://linear.app/doc',
              createdAt: null,
              updatedAt: null,
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents[0].content).toBeUndefined();
      expect(result.documents[0].slugId).toBeUndefined();
      expect(result.documents[0].createdAt).toBeUndefined();
      expect(result.documents[0].updatedAt).toBeUndefined();
    });

    it('should handle unicode in document titles', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-1',
              title: '测试文档 🚀',
              url: 'https://linear.app/doc-1',
            },
            {
              id: 'doc-2',
              title: 'Документ тест',
              url: 'https://linear.app/doc-2',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents[0].title).toBe('测试文档 🚀');
      expect(result.documents[1].title).toBe('Документ тест');
    });

    it('should handle special characters in titles', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid',
              title: "Test's \"Document\" & More!",
              url: 'https://linear.app/doc',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents[0].title).toBe("Test's \"Document\" & More!");
    });

    it('should handle empty content string (not null)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid',
              title: 'Test',
              content: '',
              url: 'https://linear.app/doc',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents[0].content).toBe('');
    });

    it('should handle documents with minimal required fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            {
              id: 'doc-uuid-1',
              title: 'Minimal Doc',
            },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents[0].id).toBe('doc-uuid-1');
      expect(result.documents[0].title).toBe('Minimal Doc');
      expect(result.documents[0].url).toBeUndefined();
    });

    it('should preserve content order from GraphQL response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documents: {
          nodes: [
            { id: 'doc-3', title: 'Third', url: 'https://linear.app/doc-3' },
            { id: 'doc-1', title: 'First', url: 'https://linear.app/doc-1' },
            { id: 'doc-2', title: 'Second', url: 'https://linear.app/doc-2' },
          ],
        },
      });

      const result = await listDocuments.execute({});
      expect(result.documents[0].id).toBe('doc-3');
      expect(result.documents[1].id).toBe('doc-1');
      expect(result.documents[2].id).toBe('doc-2');
    });
  });

});
