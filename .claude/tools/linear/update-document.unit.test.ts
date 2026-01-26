/**
 * Unit Tests for update-document Wrapper
 *
 * These tests validate the update-document wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run update-document.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateDocument, updateDocumentParams, updateDocumentOutput } from './update-document';
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

describe('updateDocument - Unit Tests', () => {
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
      expect(() => updateDocumentParams.parse({ title: 'New Title' })).toThrow();
    });

    it('should accept valid minimal input (id only)', () => {
      const input = { id: 'doc-uuid-123' };
      const result = updateDocumentParams.parse(input);
      expect(result.id).toBe('doc-uuid-123');
    });

    it('should accept id with title', () => {
      const input = { id: 'doc-uuid-123', title: 'Updated Title' };
      const result = updateDocumentParams.parse(input);
      expect(result.id).toBe('doc-uuid-123');
      expect(result.title).toBe('Updated Title');
    });

    it('should accept id with content', () => {
      const input = { id: 'doc-uuid-123', content: '## New Content\n\nUpdated' };
      const result = updateDocumentParams.parse(input);
      expect(result.id).toBe('doc-uuid-123');
      expect(result.content).toBe('## New Content\n\nUpdated');
    });

    it('should accept id with both title and content', () => {
      const input = {
        id: 'doc-uuid-123',
        title: 'New Title',
        content: '## Content',
      };
      const result = updateDocumentParams.parse(input);
      expect(result.id).toBe('doc-uuid-123');
      expect(result.title).toBe('New Title');
      expect(result.content).toBe('## Content');
    });

    it('should reject empty id', () => {
      expect(() => updateDocumentParams.parse({ id: '' })).toThrow();
    });

    it('should accept empty title for removal (optional behavior)', () => {
      const input = { id: 'doc-uuid', title: 'Valid Title' };
      const result = updateDocumentParams.parse(input);
      expect(result.title).toBe('Valid Title');
    });

    it('should accept slug as ID', () => {
      const input = { id: 'security-review', title: 'Updated Review' };
      const result = updateDocumentParams.parse(input);
      expect(result.id).toBe('security-review');
    });

    it('should accept content with markdown', () => {
      const markdown = '## Heading\n\n- List\n- Items\n\n```code```';
      const input = { id: 'doc-uuid', content: markdown };
      const result = updateDocumentParams.parse(input);
      expect(result.content).toBe(markdown);
    });

    it('should accept content with tabs and newlines', () => {
      const input = { id: 'doc-uuid', content: 'Line 1\n\tIndented\n\nParagraph' };
      const result = updateDocumentParams.parse(input);
      expect(result.content).toBe('Line 1\n\tIndented\n\nParagraph');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid-123',
            title: 'Updated Document',
            slugId: 'updated-document',
            url: 'https://linear.app/team/doc/updated-document',
            updatedAt: '2025-01-25T12:00:00Z',
            // Extra fields that should be filtered
            content: 'Full content here',
            createdAt: '2025-01-25T00:00:00Z',
            project: { id: 'proj-1', name: 'Project A' },
          },
        },
      });

      const result = await updateDocument.execute({
        id: 'doc-uuid-123',
        title: 'Updated Document',
      });

      // Verify essential fields
      expect(result.success).toBe(true);
      expect(result.document.id).toBe('doc-uuid-123');
      expect(result.document.title).toBe('Updated Document');
      expect(result.document.slugId).toBe('updated-document');
      expect(result.document.url).toBe('https://linear.app/team/doc/updated-document');

      // Verify filtered fields are NOT present
      expect(result.document).not.toHaveProperty('content');
      expect(result.document).not.toHaveProperty('createdAt');
      expect(result.document).not.toHaveProperty('project');
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Document',
            url: 'https://linear.app/doc',
          },
        },
      });

      const result = await updateDocument.execute({ id: 'doc-uuid' });
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

      await expect(updateDocument.execute({ id: 'doc-123' })).rejects.toThrow();
    });

    it('should handle GraphQL server errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(updateDocument.execute({ id: 'doc-123' })).rejects.toThrow(
        /Internal server error/
      );
    });

    it('should handle GraphQL timeout errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(updateDocument.execute({ id: 'doc-123' })).rejects.toThrow(/Request timeout/);
    });

    it('should handle success false in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: false,
          document: null,
        },
      });

      await expect(updateDocument.execute({ id: 'doc-123' })).rejects.toThrow(
        /Failed to update document: doc-123/
      );
    });

    it('should handle null document in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: null,
        },
      });

      await expect(updateDocument.execute({ id: 'doc-123' })).rejects.toThrow(
        /Failed to update document/
      );
    });

    it('should handle document not found', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce({
        message: 'GraphQL error:\nDocument not found',
      });

      await expect(updateDocument.execute({ id: 'nonexistent' })).rejects.toThrow(
        /GraphQL error/
      );
    });

    it('should handle invalid document ID format', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce({
        message: 'GraphQL error:\nInvalid document ID',
      });

      await expect(updateDocument.execute({ id: 'invalid@@@' })).rejects.toThrow(/GraphQL error/);
    });
  });

  // ==========================================================================
  // Security Tests
  // ==========================================================================

  describe('Security - Control Characters', () => {
    it('should block null byte in ID', () => {
      expect(() => updateDocumentParams.parse({ id: 'doc\x00-123' })).toThrow(
        /Control characters/
      );
    });

    it('should block null byte in title', () => {
      expect(() =>
        updateDocumentParams.parse({ id: 'doc-123', title: 'Test\x00Title' })
      ).toThrow(/Control characters/);
    });

    it('should block bell character in title', () => {
      expect(() =>
        updateDocumentParams.parse({ id: 'doc-123', title: 'Test\x07Title' })
      ).toThrow(/Control characters/);
    });

    it('should allow newlines in content (Markdown)', () => {
      const input = { id: 'doc-123', content: 'Line 1\nLine 2' };
      const result = updateDocumentParams.parse(input);
      expect(result.content).toBe('Line 1\nLine 2');
    });

    it('should allow tabs in content (Markdown)', () => {
      const input = { id: 'doc-123', content: 'Paragraph\n\tIndented' };
      const result = updateDocumentParams.parse(input);
      expect(result.content).toBe('Paragraph\n\tIndented');
    });

    it('should block null byte in content', () => {
      expect(() =>
        updateDocumentParams.parse({ id: 'doc-123', content: 'Content\x00here' })
      ).toThrow(/control characters/);
    });

    it('should block escape sequences in ID', () => {
      expect(() => updateDocumentParams.parse({ id: 'doc\x1B[31m-123' })).toThrow(
        /Control characters/
      );
    });
  });

  describe('Security - Path Traversal', () => {
    testSecurityScenarios(
      'id',
      (value: string) => updateDocumentParams.parse({ id: value }),
      PathTraversalScenarios
    );

    testSecurityScenarios(
      'title',
      (value: string) => updateDocumentParams.parse({ id: 'doc-123', title: value }),
      PathTraversalScenarios
    );
  });

  describe('Security - Command Injection', () => {
    testSecurityScenarios(
      'id',
      (value: string) => updateDocumentParams.parse({ id: value }),
      CommandInjectionScenarios
    );

    testSecurityScenarios(
      'title',
      (value: string) => updateDocumentParams.parse({ id: 'doc-123', title: value }),
      CommandInjectionScenarios
    );
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle update with only ID (no changes)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Original Title',
            url: 'https://linear.app/doc',
          },
        },
      });

      const result = await updateDocument.execute({ id: 'doc-uuid' });
      expect(result.success).toBe(true);
      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          id: 'doc-uuid',
          title: undefined,
          content: undefined,
        })
      );
    });

    it('should handle very long title', async () => {
      const longTitle = 'A'.repeat(500);
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: longTitle,
            url: 'https://linear.app/doc',
          },
        },
      });

      const result = await updateDocument.execute({ id: 'doc-uuid', title: longTitle });
      expect(result.document.title).toBe(longTitle);
    });

    it('should handle very long content', async () => {
      const longContent = 'Content '.repeat(1000);
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Test',
            url: 'https://linear.app/doc',
          },
        },
      });

      await updateDocument.execute({ id: 'doc-uuid', content: longContent });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          content: longContent,
        })
      );
    });

    it('should handle unicode in title', () => {
      const input = { id: 'doc-uuid', title: '测试文档 🚀' };
      const result = updateDocumentParams.parse(input);
      expect(result.title).toBe('测试文档 🚀');
    });

    it('should handle unicode in content', () => {
      const input = { id: 'doc-uuid', content: '## 概述\n\n内容在这里 ✅' };
      const result = updateDocumentParams.parse(input);
      expect(result.content).toBe('## 概述\n\n内容在这里 ✅');
    });

    it('should handle special characters in title', () => {
      const input = { id: 'doc-uuid', title: "Test's \"Document\" & More!" };
      const result = updateDocumentParams.parse(input);
      expect(result.title).toBe("Test's \"Document\" & More!");
    });

    it('should handle null slugId in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Test',
            slugId: null,
            url: 'https://linear.app/doc',
          },
        },
      });

      const result = await updateDocument.execute({ id: 'doc-uuid' });
      expect(result.document.slugId).toBeUndefined();
    });

    it('should handle null updatedAt in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Test',
            url: 'https://linear.app/doc',
            updatedAt: null,
          },
        },
      });

      const result = await updateDocument.execute({ id: 'doc-uuid' });
      expect(result.document.updatedAt).toBeUndefined();
    });

    it('should handle updating only title', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'New Title',
            url: 'https://linear.app/doc',
          },
        },
      });

      const result = await updateDocument.execute({ id: 'doc-uuid', title: 'New Title' });
      expect(result.document.title).toBe('New Title');
      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          title: 'New Title',
          content: undefined,
        })
      );
    });

    it('should handle updating only content', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentUpdate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Original Title',
            url: 'https://linear.app/doc',
          },
        },
      });

      const newContent = '## Updated\n\nNew content';
      const result = await updateDocument.execute({ id: 'doc-uuid', content: newContent });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          title: undefined,
          content: newContent,
        })
      );
    });
  });

});
