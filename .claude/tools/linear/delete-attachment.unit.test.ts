/**
 * delete-attachment.unit.test.ts - Unit tests for delete-attachment wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteAttachment, deleteAttachmentParams, deleteAttachmentOutput } from './delete-attachment';

// Mock the client and GraphQL helpers
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('deleteAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require id', () => {
      const result = deleteAttachmentParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid id', () => {
      const result = deleteAttachmentParams.safeParse({
        id: 'att-uuid-123'
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty id', () => {
      const result = deleteAttachmentParams.safeParse({
        id: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject control characters in id', () => {
      const result = deleteAttachmentParams.safeParse({
        id: 'att\x00id'
      });
      expect(result.success).toBe(false);
    });

    it('should reject path traversal in id', () => {
      const result = deleteAttachmentParams.safeParse({
        id: '../../../etc/passwd'
      });
      expect(result.success).toBe(false);
    });

    it('should reject command injection in id', () => {
      const result = deleteAttachmentParams.safeParse({
        id: 'att; rm -rf /'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate successful deletion response', () => {
      const result = deleteAttachmentOutput.safeParse({
        success: true,
        estimatedTokens: 25
      });
      expect(result.success).toBe(true);
    });

    it('should require success field', () => {
      const result = deleteAttachmentOutput.safeParse({
        estimatedTokens: 25
      });
      expect(result.success).toBe(false);
    });

    it('should require estimatedTokens', () => {
      const result = deleteAttachmentOutput.safeParse({
        success: true
      });
      expect(result.success).toBe(false);
    });

    it('should accept success:false', () => {
      const result = deleteAttachmentOutput.safeParse({
        success: false,
        estimatedTokens: 25
      });
      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    it('should call GraphQL with correct mutation', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        attachmentDelete: {
          success: true
        }
      });

      const result = await deleteAttachment.execute({
        id: 'att-uuid-123'
      });

      expect(createLinearClient).toHaveBeenCalled();
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('attachmentDelete'),
        expect.objectContaining({
          id: 'att-uuid-123'
        })
      );
      expect(result.success).toBe(true);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should return success status from GraphQL', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentDelete: {
          success: true
        }
      });

      const result = await deleteAttachment.execute({
        id: 'att-123'
      });

      expect(result.success).toBe(true);
    });

    it('should handle deletion failure gracefully', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentDelete: {
          success: false
        }
      });

      const result = await deleteAttachment.execute({
        id: 'att-123'
      });

      expect(result.success).toBe(false);
    });

    it('should include token estimate in response', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachmentDelete: {
          success: true
        }
      });

      const result = await deleteAttachment.execute({
        id: 'att-123'
      });

      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });
});
