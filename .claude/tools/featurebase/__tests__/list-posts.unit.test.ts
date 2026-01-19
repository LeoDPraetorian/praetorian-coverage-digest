import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { featurebaseHandlers } from './msw-handlers.js';
import { listPosts } from '../list-posts.js';
import { createFeaturebaseClient } from '../client.js';
const server = setupServer(...featurebaseHandlers);
const testClient = createFeaturebaseClient({ apiKey: 'test-api-key' });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('listPosts', () => {
  describe('input validation', () => {
    it('rejects limit > 100', async () => {
      await expect(
        listPosts.execute({ limit: 101 }, testClient)
      ).rejects.toThrow('limit cannot exceed 100');
    });

    it('rejects limit < 1', async () => {
      await expect(
        listPosts.execute({ limit: 0 }, testClient)
      ).rejects.toThrow('limit must be at least 1');
    });

    it('accepts valid limit', async () => {
      const result = await listPosts.execute({ limit: 10 }, testClient);
      expect(result).toBeDefined();
    });
  });

  describe('successful responses', () => {
    it('returns filtered posts with pagination', async () => {
      const result = await listPosts.execute({ limit: 10 }, testClient);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]).toMatchObject({
        id: 'post_test123',
        title: 'Test Post',
        status: 'in-progress'});
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.totalResults).toBe(1);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('filters by categoryId', async () => {
      const result = await listPosts.execute(
        { limit: 10, categoryId: 'board_test' },
        testClient
      );

      expect(result.posts).toBeDefined();
    });

    it('filters by status', async () => {
      const result = await listPosts.execute(
        { limit: 10, status: 'in-progress' },
        testClient
      );

      expect(result.posts).toBeDefined();
    });
  });

  describe('security validation', () => {
    it('blocks control characters in categoryId', async () => {
      await expect(
        listPosts.execute({ categoryId: 'board\x00test' }, testClient)
      ).rejects.toThrow();
    });

    it('blocks path traversal in categoryId', async () => {
      await expect(
        listPosts.execute({ categoryId: '../../../etc/passwd' }, testClient)
      ).rejects.toThrow();
    });
  });
});
