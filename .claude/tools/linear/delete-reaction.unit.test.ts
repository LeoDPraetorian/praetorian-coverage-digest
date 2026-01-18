import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteReaction, deleteReactionParams, deleteReactionOutput } from './delete-reaction';

// Mock the client
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('deleteReaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require id', () => {
      const result = deleteReactionParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid id', () => {
      const result = deleteReactionParams.safeParse({ id: 'reaction-uuid' });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in id', () => {
      const result = deleteReactionParams.safeParse({ id: 'reaction\x00id' });
      expect(result.success).toBe(false);
    });

    it('should reject empty id', () => {
      const result = deleteReactionParams.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output structure', () => {
      const result = deleteReactionOutput.safeParse({
        success: true,
        estimatedTokens: 20
      });
      expect(result.success).toBe(true);
    });

    it('should require success field', () => {
      const result = deleteReactionOutput.safeParse({
        estimatedTokens: 20
      });
      expect(result.success).toBe(false);
    });

    it('should require estimatedTokens field', () => {
      const result = deleteReactionOutput.safeParse({
        success: true
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
        reactionDelete: {
          success: true
        }
      });

      const result = await deleteReaction.execute({ id: 'reaction-uuid' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('reactionDelete'),
        expect.objectContaining({
          id: 'reaction-uuid'
        })
      );
      expect(result.success).toBe(true);
    });

    it('should throw error if mutation fails', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        reactionDelete: {
          success: false
        }
      });

      await expect(
        deleteReaction.execute({ id: 'reaction-uuid' })
      ).rejects.toThrow('Failed to delete reaction');
    });

    it('should handle missing response', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({});

      await expect(
        deleteReaction.execute({ id: 'reaction-uuid' })
      ).rejects.toThrow('Failed to delete reaction');
    });
  });
});
