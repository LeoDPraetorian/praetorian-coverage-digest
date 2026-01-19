import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { featurebaseHandlers } from './msw-handlers.js';
import { updateChangelog } from '../update-changelog.js';
import { createFeaturebaseClient } from '../client.js';
const server = setupServer(...featurebaseHandlers);
const testClient = createFeaturebaseClient({ apiKey: 'test-api-key' });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('updateChangelog', () => {
  describe('input validation', () => {
    it('rejects empty changelogId', async () => {
      await expect(
        updateChangelog.execute(
          { changelogId: '', title: 'Updated Title' },
          testClient
        )
      ).rejects.toThrow();
    });

    it('accepts valid changelogId with updates', async () => {
      const result = await updateChangelog.execute(
        { changelogId: 'changelog_test123', title: 'Updated' },
        testClient
      );
      expect(result).toBeDefined();
    });
  });

  describe('successful updates', () => {
    it('updates changelog entry title', async () => {
      const result = await updateChangelog.execute(
        {
          changelogId: 'changelog_test123',
          title: 'Updated Title'},
        testClient
      );

      expect(result.entry.id).toBe('changelog_test123');
      expect(result.entry.title).toBe('Updated Title');
      expect(result.entry.updatedAt).toBeDefined();
    });

    it('updates changelog entry content', async () => {
      const result = await updateChangelog.execute(
        {
          changelogId: 'changelog_test123',
          content: 'Updated content'},
        testClient
      );

      expect(result.entry.content).toBe('Updated content');
    });

    it('updates multiple fields', async () => {
      const result = await updateChangelog.execute(
        {
          changelogId: 'changelog_test123',
          title: 'New Title',
          content: 'New Content',
          tags: ['updated', 'feature']},
        testClient
      );

      expect(result.entry.id).toBe('changelog_test123');
    });
  });

  describe('error handling', () => {
    it('handles 404 not found', async () => {
      server.use(
        http.put('https://do.featurebase.app/v2/changelogs/:id', () => {
          return HttpResponse.json(
            { error: 'Changelog not found' },
            { status: 404 }
          );
        })
      );

      await expect(
        updateChangelog.execute(
          {
            changelogId: 'nonexistent_changelog',
            title: 'Updated Title'},
          testClient
        )
      ).rejects.toThrow('not found');
    });

    it('handles API errors gracefully', async () => {
      server.use(
        http.put('https://do.featurebase.app/v2/changelogs/:id', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(
        updateChangelog.execute(
          {
            changelogId: 'changelog_test123',
            title: 'Updated Title'},
          testClient
        )
      ).rejects.toThrow();
    });
  });
});
