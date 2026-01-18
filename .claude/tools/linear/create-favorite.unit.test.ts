// .claude/tools/linear/create-favorite.unit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFavorite, createFavoriteParams, createFavoriteOutput } from './create-favorite';

// Mock the client
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('createFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require at least one target field', () => {
      const result = createFavoriteParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept issueId', () => {
      const result = createFavoriteParams.safeParse({ issueId: 'issue-uuid' });
      expect(result.success).toBe(true);
    });

    it('should accept projectId', () => {
      const result = createFavoriteParams.safeParse({ projectId: 'project-uuid' });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in issueId', () => {
      const result = createFavoriteParams.safeParse({ issueId: 'issue\x00id' });
      expect(result.success).toBe(false);
    });

    it('should reject control characters in projectId', () => {
      const result = createFavoriteParams.safeParse({ projectId: 'proj\x00id' });
      expect(result.success).toBe(false);
    });

    it('should reject both issueId and projectId', () => {
      const result = createFavoriteParams.safeParse({
        issueId: 'issue-uuid',
        projectId: 'project-uuid'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate favorite with issue', () => {
      const result = createFavoriteOutput.safeParse({
        success: true,
        favorite: {
          id: 'fav-1',
          type: 'issue',
          issue: { id: 'issue-1', identifier: 'CHARIOT-123' }
        },
        estimatedTokens: 75
      });
      expect(result.success).toBe(true);
    });

    it('should validate favorite with project', () => {
      const result = createFavoriteOutput.safeParse({
        success: true,
        favorite: {
          id: 'fav-1',
          type: 'project',
          project: { id: 'proj-1', name: 'Platform' }
        },
        estimatedTokens: 75
      });
      expect(result.success).toBe(true);
    });

    it('should allow favorite with no issue or project (for other types)', () => {
      const result = createFavoriteOutput.safeParse({
        success: true,
        favorite: {
          id: 'fav-1',
          type: 'cycle'
        },
        estimatedTokens: 50
      });
      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    it('should call GraphQL with issueId', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        favoriteCreate: {
          success: true,
          favorite: {
            id: 'fav-1',
            type: 'issue',
            issue: { id: 'issue-1', identifier: 'CHARIOT-123' }
          }
        }
      });

      const result = await createFavorite.execute({ issueId: 'issue-uuid' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('favoriteCreate'),
        { input: { issueId: 'issue-uuid' } }
      );
      expect(result.success).toBe(true);
      expect(result.favorite.type).toBe('issue');
    });

    it('should call GraphQL with projectId', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        favoriteCreate: {
          success: true,
          favorite: {
            id: 'fav-1',
            type: 'project',
            project: { id: 'proj-1', name: 'Platform' }
          }
        }
      });

      await createFavorite.execute({ projectId: 'project-uuid' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.any(String),
        { input: { projectId: 'project-uuid' } }
      );
    });
  });
});
