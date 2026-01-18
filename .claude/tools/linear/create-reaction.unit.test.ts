import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReaction, createReactionParams, createReactionOutput } from './create-reaction';

// Mock the client
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('createReaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require commentId', () => {
      const result = createReactionParams.safeParse({ emoji: '👍' });
      expect(result.success).toBe(false);
    });

    it('should require emoji', () => {
      const result = createReactionParams.safeParse({ commentId: 'comment-uuid' });
      expect(result.success).toBe(false);
    });

    it('should accept valid commentId and emoji', () => {
      const result = createReactionParams.safeParse({
        commentId: 'comment-uuid',
        emoji: '👍'
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in commentId', () => {
      const result = createReactionParams.safeParse({
        commentId: 'comment\x00id',
        emoji: '👍'
      });
      expect(result.success).toBe(false);
    });

    it('should reject control characters in emoji', () => {
      const result = createReactionParams.safeParse({
        commentId: 'comment-uuid',
        emoji: '👍\x00'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output structure', () => {
      const result = createReactionOutput.safeParse({
        success: true,
        reaction: {
          id: 'reaction-1',
          emoji: '👍',
          user: { id: 'user-1', name: 'Test User' },
          commentId: 'comment-1'
        },
        estimatedTokens: 50
      });
      expect(result.success).toBe(true);
    });

    it('should require success field', () => {
      const result = createReactionOutput.safeParse({
        reaction: { id: 'r1', emoji: '👍' },
        estimatedTokens: 50
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
        reactionCreate: {
          success: true,
          reaction: {
            id: 'r1',
            emoji: '👍',
            user: { id: 'u1', name: 'Test User' },
            comment: { id: 'c1' }
          }
        }
      });

      const result = await createReaction.execute({
        commentId: 'comment-uuid',
        emoji: '👍'
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('reactionCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            commentId: 'comment-uuid',
            emoji: '👍'
          })
        })
      );
      expect(result.success).toBe(true);
      expect(result.reaction.emoji).toBe('👍');
    });

    it('should throw error if mutation fails', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        reactionCreate: {
          success: false
        }
      });

      await expect(
        createReaction.execute({ commentId: 'comment-uuid', emoji: '👍' })
      ).rejects.toThrow('Failed to create reaction');
    });
  });
});
