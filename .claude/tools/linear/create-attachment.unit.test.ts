/**
 * create-attachment.unit.test.ts - Unit tests for create-attachment wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAttachment, createAttachmentParams, createAttachmentOutput } from './create-attachment';

// Mock the client and GraphQL helpers
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('createAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require issueId, title, and url', () => {
      const result = createAttachmentParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept required fields only', () => {
      const result = createAttachmentParams.safeParse({
        issueId: 'issue-uuid-123',
        title: 'Design mockup',
        url: 'https://example.com/mockup.pdf'
      });
      expect(result.success).toBe(true);
    });

    it('should accept all optional fields', () => {
      const result = createAttachmentParams.safeParse({
        issueId: 'issue-uuid-123',
        title: 'Design mockup',
        subtitle: 'Sprint 5',
        url: 'https://example.com/mockup.pdf',
        metadata: { size: 1024, type: 'pdf' }
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in issueId', () => {
      const result = createAttachmentParams.safeParse({
        issueId: 'issue\x00id',
        title: 'Test',
        url: 'https://example.com/test.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should reject control characters in title', () => {
      const result = createAttachmentParams.safeParse({
        issueId: 'issue-123',
        title: 'Test\x00Title',
        url: 'https://example.com/test.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const result = createAttachmentParams.safeParse({
        issueId: 'issue-123',
        title: 'Test',
        url: 'not-a-url'
      });
      expect(result.success).toBe(false);
    });

    it('should accept https URL', () => {
      const result = createAttachmentParams.safeParse({
        issueId: 'issue-123',
        title: 'Test',
        url: 'https://example.com/file.pdf'
      });
      expect(result.success).toBe(true);
    });

    it('should accept http URL', () => {
      const result = createAttachmentParams.safeParse({
        issueId: 'issue-123',
        title: 'Test',
        url: 'http://example.com/file.pdf'
      });
      expect(result.success).toBe(true);
    });

    it('should reject path traversal in issueId', () => {
      const result = createAttachmentParams.safeParse({
        issueId: '../../../etc/passwd',
        title: 'Test',
        url: 'https://example.com/test.pdf'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate successful creation response', () => {
      const result = createAttachmentOutput.safeParse({
        success: true,
        attachment: {
          id: 'att-1',
          title: 'Design mockup',
          url: 'https://example.com/mockup.pdf'
        },
        estimatedTokens: 50
      });
      expect(result.success).toBe(true);
    });

    it('should require success field', () => {
      const result = createAttachmentOutput.safeParse({
        attachment: {
          id: 'att-1',
          title: 'Test',
          url: 'https://example.com/test.pdf'
        },
        estimatedTokens: 50
      });
      expect(result.success).toBe(false);
    });

    it('should require estimatedTokens', () => {
      const result = createAttachmentOutput.safeParse({
        success: true,
        attachment: {
          id: 'att-1',
          title: 'Test',
          url: 'https://example.com/test.pdf'
        }
      });
      expect(result.success).toBe(false);
    });
  });

  describe('execute', () => {
    it('should call GraphQL with correct mutation', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        attachmentCreate: {
          success: true,
          attachment: {
            id: 'att-1',
            title: 'Design mockup',
            url: 'https://example.com/mockup.pdf'
          }
        }
      });

      const result = await createAttachment.execute({
        issueId: 'issue-123',
        title: 'Design mockup',
        url: 'https://example.com/mockup.pdf'
      });

      expect(createLinearClient).toHaveBeenCalled();
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('attachmentCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            issueId: 'issue-123',
            title: 'Design mockup',
            url: 'https://example.com/mockup.pdf'
          })
        })
      );
      expect(result.success).toBe(true);
      expect(result.attachment.id).toBe('att-1');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should include optional fields in mutation when provided', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentCreate: {
          success: true,
          attachment: {
            id: 'att-1',
            title: 'Design mockup',
            url: 'https://example.com/mockup.pdf'
          }
        }
      });

      await createAttachment.execute({
        issueId: 'issue-123',
        title: 'Design mockup',
        subtitle: 'Sprint 5',
        url: 'https://example.com/mockup.pdf',
        metadata: { size: 1024 }
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            issueId: 'issue-123',
            title: 'Design mockup',
            subtitle: 'Sprint 5',
            url: 'https://example.com/mockup.pdf',
            metadata: { size: 1024 }
          })
        })
      );
    });

    it('should throw error when attachment creation fails', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentCreate: {
          success: false
        }
      });

      await expect(
        createAttachment.execute({
          issueId: 'issue-123',
          title: 'Test',
          url: 'https://example.com/test.pdf'
        })
      ).rejects.toThrow('Failed to create attachment');
    });

    it('should throw error when response is missing attachment', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentCreate: {
          success: true
          // Missing attachment field
        }
      });

      await expect(
        createAttachment.execute({
          issueId: 'issue-123',
          title: 'Test',
          url: 'https://example.com/test.pdf'
        })
      ).rejects.toThrow('Failed to create attachment');
    });
  });
});
