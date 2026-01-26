import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { featurebaseHandlers } from './msw-handlers.js';
import { getPost } from '../get-post.js';
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

describe('getPost', () => {
  describe('input validation', () => {
    it('rejects empty postId', async () => {
      await expect(
        getPost.execute({ postId: '' }, testClient)
      ).rejects.toThrow();
    });

    it('rejects control characters in postId', async () => {
      await expect(
        getPost.execute({ postId: 'post\x00123' }, testClient)
      ).rejects.toThrow();
    });
  });

  describe('successful responses', () => {
    it('returns full post details', async () => {
      const result = await getPost.execute(
        { postId: 'post_test123' },
        testClient
      );

      expect(result.post).toMatchObject({
        id: 'post_test123',
        title: 'Test Post',
        content: 'Test content',
        status: 'in-progress'});
    });
  });

  describe('error handling', () => {
    it('handles 404 not found', async () => {
      server.use(
        http.get('https://do.featurebase.app/v2/posts/:id', () => {
          return HttpResponse.json(
            { error: 'Post not found' },
            { status: 404 }
          );
        })
      );

      await expect(
        getPost.execute({ postId: 'nonexistent' }, testClient)
      ).rejects.toThrow('not found');
    });
  });
});
