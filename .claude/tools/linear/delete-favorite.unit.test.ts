// .claude/tools/linear/delete-favorite.unit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteFavorite, deleteFavoriteParams, deleteFavoriteOutput } from './delete-favorite';

// Mock the client
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('deleteFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require id', () => {
      const result = deleteFavoriteParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid id', () => {
      const result = deleteFavoriteParams.safeParse({ id: 'favorite-uuid' });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in id', () => {
      const result = deleteFavoriteParams.safeParse({ id: 'fav\x00id' });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output structure', () => {
      const result = deleteFavoriteOutput.safeParse({
        success: true,
        estimatedTokens: 25
      });
      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    it('should call GraphQL with correct mutation and variables', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        favoriteDelete: {
          success: true
        }
      });

      const result = await deleteFavorite.execute({ id: 'favorite-uuid' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('favoriteDelete'),
        { id: 'favorite-uuid' }
      );
      expect(result.success).toBe(true);
    });
  });
});
