/**
 * update-attachment.unit.test.ts - Unit tests for update-attachment wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateAttachment, updateAttachmentParams, updateAttachmentOutput } from './update-attachment';

// Mock the client and GraphQL helpers
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('updateAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require id', () => {
      const result = updateAttachmentParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept id with single update field', () => {
      const result = updateAttachmentParams.safeParse({
        id: 'att-uuid-123',
        title: 'Updated title'
      });
      expect(result.success).toBe(true);
    });

    it('should accept all optional update fields', () => {
      const result = updateAttachmentParams.safeParse({
        id: 'att-uuid-123',
        title: 'Updated title',
        subtitle: 'Updated subtitle',
        metadata: { version: 2 }
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in id', () => {
      const result = updateAttachmentParams.safeParse({
        id: 'att\x00id',
        title: 'Test'
      });
      expect(result.success).toBe(false);
    });

    it('should reject control characters in title', () => {
      const result = updateAttachmentParams.safeParse({
        id: 'att-123',
        title: 'Test\x00Title'
      });
      expect(result.success).toBe(false);
    });

    it('should reject path traversal in id', () => {
      const result = updateAttachmentParams.safeParse({
        id: '../../../etc/passwd',
        title: 'Test'
      });
      expect(result.success).toBe(false);
    });

    it('should accept id only without update fields', () => {
      const result = updateAttachmentParams.safeParse({
        id: 'att-123'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('output validation', () => {
    it('should validate successful update response', () => {
      const result = updateAttachmentOutput.safeParse({
        success: true,
        attachment: {
          id: 'att-1',
          title: 'Updated title',
          url: 'https://example.com/updated.pdf'
        },
        estimatedTokens: 50
      });
      expect(result.success).toBe(true);
    });

    it('should require success field', () => {
      const result = updateAttachmentOutput.safeParse({
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
      const result = updateAttachmentOutput.safeParse({
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
        attachmentUpdate: {
          success: true,
          attachment: {
            id: 'att-1',
            title: 'Updated title',
            url: 'https://example.com/file.pdf'
          }
        }
      });

      const result = await updateAttachment.execute({
        id: 'att-1',
        title: 'Updated title'
      });

      expect(createLinearClient).toHaveBeenCalled();
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('attachmentUpdate'),
        expect.objectContaining({
          id: 'att-1',
          input: expect.objectContaining({
            title: 'Updated title'
          })
        })
      );
      expect(result.success).toBe(true);
      expect(result.attachment.title).toBe('Updated title');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should only include fields that are provided in update', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentUpdate: {
          success: true,
          attachment: {
            id: 'att-1',
            title: 'Old title',
            url: 'https://example.com/file.pdf'
          }
        }
      });

      await updateAttachment.execute({
        id: 'att-1',
        subtitle: 'New subtitle only'
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          input: { subtitle: 'New subtitle only' }
        })
      );
    });

    it('should include multiple fields when provided', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentUpdate: {
          success: true,
          attachment: {
            id: 'att-1',
            title: 'Updated',
            url: 'https://example.com/file.pdf'
          }
        }
      });

      await updateAttachment.execute({
        id: 'att-1',
        title: 'Updated title',
        subtitle: 'Updated subtitle',
        metadata: { version: 3 }
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            title: 'Updated title',
            subtitle: 'Updated subtitle',
            metadata: { version: 3 }
          })
        })
      );
    });

    it('should throw error when update fails', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentUpdate: {
          success: false
        }
      });

      await expect(
        updateAttachment.execute({
          id: 'att-1',
          title: 'Test'
        })
      ).rejects.toThrow('Failed to update attachment');
    });

    it('should throw error when response is missing attachment', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentUpdate: {
          success: true
          // Missing attachment field
        }
      });

      await expect(
        updateAttachment.execute({
          id: 'att-1',
          title: 'Test'
        })
      ).rejects.toThrow('Failed to update attachment');
    });
  });
});
