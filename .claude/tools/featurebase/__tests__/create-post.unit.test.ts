import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { featurebaseHandlers } from './msw-handlers.js';
import { createPost } from '../create-post.js';
import { createFeaturebaseClientAsync } from '../client.js';
import type { SecretsProvider, HTTPPort } from '../../config/lib/index.js';

const server = setupServer(...featurebaseHandlers);

const mockProvider: SecretsProvider = {
  name: 'test',
  getSecret: async () => ({ ok: true, value: 'test-api-key' }),
};

let testClient: HTTPPort;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'error' });
  testClient = await createFeaturebaseClientAsync(mockProvider);
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createPost', () => {
  describe('input validation', () => {
    it('rejects empty title', async () => {
      await expect(
        createPost.execute(
          { title: '', content: 'Content', categoryId: 'board_1' },
          testClient
        )
      ).rejects.toThrow();
    });

    it('rejects empty content', async () => {
      await expect(
        createPost.execute(
          { title: 'Title', content: '', categoryId: 'board_1' },
          testClient
        )
      ).rejects.toThrow();
    });

    it('rejects empty categoryId', async () => {
      await expect(
        createPost.execute(
          { title: 'Title', content: 'Content', categoryId: '' },
          testClient
        )
      ).rejects.toThrow();
    });
  });

  describe('successful creation', () => {
    it('creates post and returns ID', async () => {
      const result = await createPost.execute(
        {
          title: 'New Feature Request',
          content: 'Please add this feature',
          categoryId: 'board_test'},
        testClient
      );

      expect(result.post.id).toBe('post_new123');
      expect(result.post.title).toBe('New Feature Request');
    });

    it('creates post with optional fields', async () => {
      const result = await createPost.execute(
        {
          title: 'Feature',
          content: 'Content',
          categoryId: 'board_test',
          tags: ['enhancement', 'ui'],
          statusId: 'status_planned'},
        testClient
      );

      expect(result.post.id).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('handles 404 not found (board not found)', async () => {
      server.use(
        http.post('https://do.featurebase.app/v2/posts', () => {
          return HttpResponse.json(
            { error: 'Board not found' },
            { status: 404 }
          );
        })
      );

      await expect(
        createPost.execute(
          {
            title: 'Test',
            content: 'Test content',
            categoryId: 'nonexistent_board'},
          testClient
        )
      ).rejects.toThrow('not found');
    });

    it('handles API errors gracefully', async () => {
      server.use(
        http.post('https://do.featurebase.app/v2/posts', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(
        createPost.execute(
          {
            title: 'Test',
            content: 'Test content',
            categoryId: 'board_test'},
          testClient
        )
      ).rejects.toThrow();
    });
  });
});
