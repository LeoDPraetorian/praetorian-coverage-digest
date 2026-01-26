/**
 * Unit Tests for get-document Wrapper
 *
 * These tests validate the get-document wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run get-document.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDocument, getDocumentParams, getDocumentOutput } from './get-document';
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

describe('getDocument - Unit Tests', () => {
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
    it('should require id field', () => {
      expect(() => getDocumentParams.parse({})).toThrow();
    });

    it('should accept valid UUID', () => {
      const input = { id: 'doc-uuid-123-456-789' };
      const result = getDocumentParams.parse(input);
      expect(result.id).toBe('doc-uuid-123-456-789');
    });

    it('should accept valid slug', () => {
      const input = { id: 'security-review' };
      const result = getDocumentParams.parse(input);
      expect(result.id).toBe('security-review');
    });

    it('should reject empty id', () => {
      expect(() => getDocumentParams.parse({ id: '' })).toThrow();
    });

    it('should accept alphanumeric IDs', () => {
      const input = { id: 'doc123ABC' };
      const result = getDocumentParams.parse(input);
      expect(result.id).toBe('doc123ABC');
    });

    it('should accept IDs with hyphens', () => {
      const input = { id: 'my-doc-2024-01' };
      const result = getDocumentParams.parse(input);
      expect(result.id).toBe('my-doc-2024-01');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid-123',
          title: 'Test Document',
          content: 'Full document content here that is very long...'.repeat(20),
          slugId: 'test-document',
          url: 'https://linear.app/team/doc/test-document',
          createdAt: '2025-01-25T00:00:00Z',
          updatedAt: '2025-01-25T01:00:00Z',
          // Extra fields that should be filtered
          project: { id: 'proj-1', name: 'Project A' },
          creator: { id: 'user-1', name: 'John' },
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid-123' });

      // Verify essential fields
      expect(result.id).toBe('doc-uuid-123');
      expect(result.title).toBe('Test Document');
      expect(result.slugId).toBe('test-document');
      expect(result.url).toBe('https://linear.app/team/doc/test-document');

      // Verify filtered fields are NOT present
      expect(result).not.toHaveProperty('project');
      expect(result).not.toHaveProperty('creator');
    });

    it('should truncate content to 1000 characters', async () => {
      const longContent = 'A'.repeat(2000);
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: 'Document',
          content: longContent,
          url: 'https://linear.app/doc',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.content).toBeDefined();
      expect(result.content!.length).toBe(1000);
      expect(result.content).toBe(longContent.substring(0, 1000));
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: 'Document',
          url: 'https://linear.app/doc',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
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

      await expect(getDocument.execute({ id: 'doc-123' })).rejects.toThrow();
    });

    it('should handle GraphQL server errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(getDocument.execute({ id: 'doc-123' })).rejects.toThrow(
        /Internal server error/
      );
    });

    it('should handle GraphQL timeout errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(getDocument.execute({ id: 'doc-123' })).rejects.toThrow(/Request timeout/);
    });

    it('should handle document not found', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: null,
      });

      await expect(getDocument.execute({ id: 'nonexistent-doc' })).rejects.toThrow(
        /Document not found: nonexistent-doc/
      );
    });

    it('should handle null document in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: null,
      });

      await expect(getDocument.execute({ id: 'doc-123' })).rejects.toThrow(/Document not found/);
    });

    it('should handle missing required fields', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          // Missing title
          url: 'https://linear.app/doc',
        },
      });

      await expect(getDocument.execute({ id: 'doc-uuid' })).rejects.toThrow();
    });

    it('should handle GraphQL error with invalid ID format', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce({
        message: 'GraphQL error:\nInvalid document ID format',
      });

      await expect(getDocument.execute({ id: 'invalid@@@id' })).rejects.toThrow(/GraphQL error/);
    });
  });

  // ==========================================================================
  // Security Tests
  // ==========================================================================

  describe('Security - Control Characters', () => {
    it('should block null byte in ID', () => {
      expect(() => getDocumentParams.parse({ id: 'doc-123\x00' })).toThrow(/Control characters/);
    });

    it('should block bell character in ID', () => {
      expect(() => getDocumentParams.parse({ id: 'doc\x07-123' })).toThrow(/Control characters/);
    });

    it('should block backspace in ID', () => {
      expect(() => getDocumentParams.parse({ id: 'doc\x08-123' })).toThrow(/Control characters/);
    });

    it('should block carriage return in ID', () => {
      expect(() => getDocumentParams.parse({ id: 'doc-123\r' })).toThrow(/Control characters/);
    });

    it('should block escape sequence in ID', () => {
      expect(() => getDocumentParams.parse({ id: 'doc\x1B[31m-123' })).toThrow(
        /Control characters/
      );
    });
  });

  describe('Security - Path Traversal', () => {
    testSecurityScenarios(
      'id',
      (value: string) => getDocumentParams.parse({ id: value }),
      PathTraversalScenarios
    );
  });

  describe('Security - Command Injection', () => {
    testSecurityScenarios(
      'id',
      (value: string) => getDocumentParams.parse({ id: value }),
      CommandInjectionScenarios
    );
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle null content in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: 'Empty Document',
          content: null,
          url: 'https://linear.app/doc',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.content).toBeUndefined();
    });

    it('should handle null slugId in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: 'Test',
          slugId: null,
          url: 'https://linear.app/doc',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.slugId).toBeUndefined();
    });

    it('should handle missing optional fields', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: 'Minimal Document',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.id).toBe('doc-uuid');
      expect(result.title).toBe('Minimal Document');
      expect(result.content).toBeUndefined();
      expect(result.url).toBeUndefined();
    });

    it('should handle unicode in document title', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: '测试文档 🚀',
          content: '## 概述\n\n内容',
          url: 'https://linear.app/doc',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.title).toBe('测试文档 🚀');
      expect(result.content).toBe('## 概述\n\n内容');
    });

    it('should handle special characters in document title', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: "Test's \"Document\" & More!",
          url: 'https://linear.app/doc',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.title).toBe("Test's \"Document\" & More!");
    });

    it('should handle very long document ID', () => {
      const longId = 'doc-' + 'a'.repeat(500);
      const input = { id: longId };
      const result = getDocumentParams.parse(input);
      expect(result.id).toBe(longId);
    });

    it('should handle empty content string (not null)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: 'Test',
          content: '',
          url: 'https://linear.app/doc',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.content).toBe('');
    });

    it('should handle document with minimal valid content', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: 'Test',
          content: 'x',
          url: 'https://linear.app/doc',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.content).toBe('x');
    });

    it('should handle timestamp fields correctly', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        document: {
          id: 'doc-uuid',
          title: 'Test',
          url: 'https://linear.app/doc',
          createdAt: '2025-01-25T10:00:00.000Z',
          updatedAt: '2025-01-25T11:00:00.000Z',
        },
      });

      const result = await getDocument.execute({ id: 'doc-uuid' });
      expect(result.createdAt).toBe('2025-01-25T10:00:00.000Z');
      expect(result.updatedAt).toBe('2025-01-25T11:00:00.000Z');
    });
  });

});
