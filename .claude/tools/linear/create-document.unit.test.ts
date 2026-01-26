/**
 * Unit Tests for create-document Wrapper
 *
 * These tests validate the create-document wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run create-document.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDocument, createDocumentParams, createDocumentOutput } from './create-document';
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

describe('createDocument - Unit Tests', () => {
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
    it('should require title field', () => {
      expect(() => createDocumentParams.parse({ content: 'Content' })).toThrow();
    });

    it('should require content field', () => {
      expect(() => createDocumentParams.parse({ title: 'Test Doc' })).toThrow();
    });

    it('should accept valid minimal input', () => {
      const input = { title: 'Test Document', content: '## Overview\n\nContent here' };
      const result = createDocumentParams.parse(input);
      expect(result.title).toBe('Test Document');
      expect(result.content).toBe('## Overview\n\nContent here');
    });

    it('should reject empty title', () => {
      expect(() => createDocumentParams.parse({ title: '', content: 'Content' })).toThrow();
    });

    it('should reject empty content', () => {
      expect(() => createDocumentParams.parse({ title: 'Title', content: '' })).toThrow();
    });

    it('should accept optional project', () => {
      const input = { title: 'Test', content: 'Content', project: 'proj-uuid-123' };
      const result = createDocumentParams.parse(input);
      expect(result.project).toBe('proj-uuid-123');
    });

    it('should accept optional initiative', () => {
      const input = { title: 'Test', content: 'Content', initiative: 'init-uuid-123' };
      const result = createDocumentParams.parse(input);
      expect(result.initiative).toBe('init-uuid-123');
    });

    it('should accept content with markdown', () => {
      const markdown = '## Heading\n\n- List item\n- Another\n\n```code```';
      const input = { title: 'Test', content: markdown };
      const result = createDocumentParams.parse(input);
      expect(result.content).toBe(markdown);
    });

    it('should accept content with tabs and newlines', () => {
      const input = { title: 'Test', content: 'Line 1\n\tIndented\n\nParagraph' };
      const result = createDocumentParams.parse(input);
      expect(result.content).toBe('Line 1\n\tIndented\n\nParagraph');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentCreate: {
          success: true,
          document: {
            id: 'doc-uuid-123',
            title: 'Test Document',
            slugId: 'test-document',
            url: 'https://linear.app/team/doc/test-document',
            createdAt: '2025-01-25T00:00:00Z',
            updatedAt: '2025-01-25T00:00:00Z',
            // Extra fields that should be filtered
            content: 'Full content here',
            project: { id: 'proj-1', name: 'Project A' },
          },
        },
      });

      const result = await createDocument.execute({
        title: 'Test Document',
        content: '## Overview',
      });

      // Verify essential fields
      expect(result.success).toBe(true);
      expect(result.document.id).toBe('doc-uuid-123');
      expect(result.document.title).toBe('Test Document');
      expect(result.document.slugId).toBe('test-document');
      expect(result.document.url).toBe('https://linear.app/team/doc/test-document');

      // Verify filtered fields are NOT present
      expect(result.document).not.toHaveProperty('content');
      expect(result.document).not.toHaveProperty('project');
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentCreate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Document',
            url: 'https://linear.app/doc',
          },
        },
      });

      const result = await createDocument.execute({ title: 'Document', content: 'Content' });
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

      await expect(
        createDocument.execute({ title: 'Test', content: 'Content' })
      ).rejects.toThrow();
    });

    it('should handle GraphQL server errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(
        createDocument.execute({ title: 'Test', content: 'Content' })
      ).rejects.toThrow(/Internal server error/);
    });

    it('should handle GraphQL timeout errors', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(
        createDocument.execute({ title: 'Test', content: 'Content' })
      ).rejects.toThrow(/Request timeout/);
    });

    it('should handle success false in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentCreate: {
          success: false,
          document: null,
        },
      });

      await expect(
        createDocument.execute({ title: 'Test', content: 'Content' })
      ).rejects.toThrow(/Failed to create document/);
    });

    it('should handle missing document ID in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentCreate: {
          success: true,
          document: {
            title: 'Test',
            url: 'https://linear.app/doc',
          },
        },
      });

      await expect(
        createDocument.execute({ title: 'Test', content: 'Content' })
      ).rejects.toThrow(/No document ID returned/);
    });

    it('should handle null document in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentCreate: {
          success: true,
          document: null,
        },
      });

      await expect(
        createDocument.execute({ title: 'Test', content: 'Content' })
      ).rejects.toThrow();
    });

    it('should handle invalid project ID', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce({
        message: 'GraphQL error:\nProject not found',
      });

      await expect(
        createDocument.execute({ title: 'Test', content: 'Content', project: 'invalid-id' })
      ).rejects.toThrow(/GraphQL error/);
    });

    it('should handle invalid initiative ID', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce({
        message: 'GraphQL error:\nInitiative not found',
      });

      await expect(
        createDocument.execute({ title: 'Test', content: 'Content', initiative: 'invalid-id' })
      ).rejects.toThrow(/GraphQL error/);
    });
  });

  // ==========================================================================
  // Security Tests
  // ==========================================================================

  describe('Security - Control Characters', () => {
    it('should block null byte in title', () => {
      expect(() =>
        createDocumentParams.parse({ title: 'Test\x00Document', content: 'Content' })
      ).toThrow(/Control characters/);
    });

    it('should block bell character in title', () => {
      expect(() =>
        createDocumentParams.parse({ title: 'Test\x07Document', content: 'Content' })
      ).toThrow(/Control characters/);
    });

    it('should block backspace in title', () => {
      expect(() =>
        createDocumentParams.parse({ title: 'Test\x08Document', content: 'Content' })
      ).toThrow(/Control characters/);
    });

    it('should allow newlines in content (Markdown)', () => {
      const input = { title: 'Test', content: 'Line 1\nLine 2' };
      const result = createDocumentParams.parse(input);
      expect(result.content).toBe('Line 1\nLine 2');
    });

    it('should allow tabs in content (Markdown)', () => {
      const input = { title: 'Test', content: 'Paragraph\n\tIndented' };
      const result = createDocumentParams.parse(input);
      expect(result.content).toBe('Paragraph\n\tIndented');
    });

    it('should block null byte in content', () => {
      expect(() =>
        createDocumentParams.parse({ title: 'Test', content: 'Content\x00here' })
      ).toThrow(/control characters/);
    });
  });

  describe('Security - Path Traversal', () => {
    testSecurityScenarios(
      'title',
      (value: string) =>
        createDocumentParams.parse({ title: value, content: 'Content' }),
      PathTraversalScenarios
    );

    testSecurityScenarios(
      'project',
      (value: string) =>
        createDocumentParams.parse({ title: 'Test', content: 'Content', project: value }),
      PathTraversalScenarios
    );
  });

  describe('Security - Command Injection', () => {
    testSecurityScenarios(
      'title',
      (value: string) =>
        createDocumentParams.parse({ title: value, content: 'Content' }),
      CommandInjectionScenarios
    );

    testSecurityScenarios(
      'initiative',
      (value: string) =>
        createDocumentParams.parse({ title: 'Test', content: 'Content', initiative: value }),
      CommandInjectionScenarios
    );
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(500);
      const input = { title: longTitle, content: 'Content' };
      const result = createDocumentParams.parse(input);
      expect(result.title).toBe(longTitle);
    });

    it('should handle very long content', () => {
      const longContent = 'Content '.repeat(1000);
      const input = { title: 'Test', content: longContent };
      const result = createDocumentParams.parse(input);
      expect(result.content).toBe(longContent);
    });

    it('should handle unicode in title', () => {
      const input = { title: '测试文档 🚀', content: 'Content' };
      const result = createDocumentParams.parse(input);
      expect(result.title).toBe('测试文档 🚀');
    });

    it('should handle unicode in content', () => {
      const input = { title: 'Test', content: '## 概述\n\n内容在这里 ✅' };
      const result = createDocumentParams.parse(input);
      expect(result.content).toBe('## 概述\n\n内容在这里 ✅');
    });

    it('should handle special characters in title', () => {
      const input = { title: "Test's \"Document\" & More!", content: 'Content' };
      const result = createDocumentParams.parse(input);
      expect(result.title).toBe("Test's \"Document\" & More!");
    });

    it('should handle null slugId in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentCreate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Test',
            slugId: null,
            url: 'https://linear.app/doc',
          },
        },
      });

      const result = await createDocument.execute({ title: 'Test', content: 'Content' });
      expect(result.document.slugId).toBeUndefined();
    });

    it('should handle null timestamps in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentCreate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Test',
            url: 'https://linear.app/doc',
            createdAt: null,
            updatedAt: null,
          },
        },
      });

      const result = await createDocument.execute({ title: 'Test', content: 'Content' });
      expect(result.document.createdAt).toBeUndefined();
      expect(result.document.updatedAt).toBeUndefined();
    });

    it('should handle document with both project and initiative', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        documentCreate: {
          success: true,
          document: {
            id: 'doc-uuid',
            title: 'Test',
            url: 'https://linear.app/doc',
          },
        },
      });

      const result = await createDocument.execute({
        title: 'Test',
        content: 'Content',
        project: 'proj-123',
        initiative: 'init-456',
      });

      expect(result.success).toBe(true);
      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          projectId: 'proj-123',
          initiativeId: 'init-456',
        })
      );
    });
  });

});
