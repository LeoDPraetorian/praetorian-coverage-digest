import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { featurebaseHandlers } from './msw-handlers.js';
import { createChangelog } from '../create-changelog.js';
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

describe('createChangelog', () => {
  describe('input validation', () => {
    it('rejects empty title', async () => {
      await expect(
        createChangelog.execute(
          { title: '', content: 'Content', publishedAt: '2026-01-13T10:00:00Z' },
          testClient
        )
      ).rejects.toThrow();
    });

    it('rejects empty content', async () => {
      await expect(
        createChangelog.execute(
          { title: 'Title', content: '', publishedAt: '2026-01-13T10:00:00Z' },
          testClient
        )
      ).rejects.toThrow();
    });

    it('rejects empty publishedAt', async () => {
      await expect(
        createChangelog.execute(
          { title: 'Title', content: 'Content', publishedAt: '' },
          testClient
        )
      ).rejects.toThrow();
    });
  });

  describe('successful creation', () => {
    it('creates changelog entry and returns ID', async () => {
      const result = await createChangelog.execute(
        {
          title: 'New Feature Release',
          content: 'We released a new feature',
          publishedAt: '2026-01-13T10:00:00Z',
        },
        testClient
      );

      expect(result.entry.id).toBe('changelog_new123');
      expect(result.entry.title).toBe('New Feature Release');
      expect(result.entry.content).toBe('We released a new feature');
    });

    it('creates changelog entry with optional tags', async () => {
      const result = await createChangelog.execute(
        {
          title: 'Release',
          content: 'Content',
          publishedAt: '2026-01-13T10:00:00Z',
          tags: ['feature', 'update'],
        },
        testClient
      );

      expect(result.entry.id).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      server.use(
        http.post('https://do.featurebase.app/v2/changelogs', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(
        createChangelog.execute(
          {
            title: 'Test',
            content: 'Test content',
            publishedAt: '2026-01-13T10:00:00Z',
          },
          testClient
        )
      ).rejects.toThrow();
    });
  });
});
