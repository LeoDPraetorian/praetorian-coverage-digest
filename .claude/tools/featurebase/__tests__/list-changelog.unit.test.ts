import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { featurebaseHandlers } from './msw-handlers.js';
import { listChangelog } from '../list-changelog.js';
import { createFeaturebaseClient } from '../client.js';
const server = setupServer(...featurebaseHandlers);
const testClient = createFeaturebaseClient({ apiKey: 'test-api-key' });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('listChangelog', () => {
  describe('input validation', () => {
    it('rejects limit > 100', async () => {
      await expect(
        listChangelog.execute({ limit: 101 }, testClient)
      ).rejects.toThrow('limit cannot exceed 100');
    });

    it('rejects limit < 1', async () => {
      await expect(
        listChangelog.execute({ limit: 0 }, testClient)
      ).rejects.toThrow('limit must be at least 1');
    });

    it('accepts valid limit', async () => {
      const result = await listChangelog.execute({ limit: 10 }, testClient);
      expect(result).toBeDefined();
    });
  });

  describe('successful responses', () => {
    it('returns filtered changelog entries with pagination', async () => {
      const result = await listChangelog.execute({ limit: 10 }, testClient);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        id: 'changelog_test123',
        title: 'Test Changelog',
        content: expect.any(String),
        publishedAt: expect.any(String)});
      expect(result.nextCursor).toBeNull();
      expect(result.totalCount).toBe(1);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('filters by tags', async () => {
      const result = await listChangelog.execute(
        { limit: 10, tags: ['feature'] },
        testClient
      );

      expect(result.entries).toBeDefined();
    });
  });

  describe('token optimization', () => {
    it('truncates content to 500 characters', async () => {
      const result = await listChangelog.execute({ limit: 10 }, testClient);

      if (result.entries.length > 0) {
        expect(result.entries[0].content.length).toBeLessThanOrEqual(500);
      }
    });

    it('includes token estimate in response', async () => {
      const result = await listChangelog.execute({ limit: 10 }, testClient);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      server.use(
        http.get('https://do.featurebase.app/v2/changelogs', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(
        listChangelog.execute({ limit: 10 }, testClient)
      ).rejects.toThrow();
    });
  });
});
