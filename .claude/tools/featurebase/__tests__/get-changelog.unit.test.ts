/**
 * Unit tests for get-changelog
 *
 * Tests getChangelog wrapper for fetching a single changelog entry.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { featurebaseHandlers } from './msw-handlers.js';
import { getChangelog } from '../get-changelog.js';
import { createFeaturebaseClient } from '../client.js';
// Setup MSW server with FeatureBase handlers
const server = setupServer(...featurebaseHandlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('getChangelog', () => {
  it('fetches changelog by ID', async () => {
    const client = createFeaturebaseClient({ apiKey: 'test-key' });
    const result = await getChangelog.execute({ changelogId: 'changelog_123' }, client);

    expect(result.entry.id).toBe('changelog_123');
    expect(result.entry.title).toBe('Test Changelog');
    expect(result.entry.content).toBe('Test changelog content');
    expect(result.entry.publishedAt).toBe('2026-01-09T10:00:00Z');
    expect(result.entry.tags).toEqual(['feature', 'update']);
  });

  it('validates changelogId is required', async () => {
    const client = createFeaturebaseClient({ apiKey: 'test-key' });
    await expect(
      getChangelog.execute({ changelogId: '' }, client)
    ).rejects.toThrow('changelogId is required');
  });

  it('validates changelogId contains no control characters', async () => {
    const client = createFeaturebaseClient({ apiKey: 'test-key' });
    await expect(
      getChangelog.execute({ changelogId: 'test\n123' }, client)
    ).rejects.toThrow('Control characters not allowed');
  });

  describe('error handling', () => {
    it('handles 404 not found', async () => {
      const client = createFeaturebaseClient({ apiKey: 'test-key' });
      server.use(
        http.get('https://do.featurebase.app/v2/changelogs/:id', () => {
          return HttpResponse.json(
            { error: 'Changelog not found' },
            { status: 404 }
          );
        })
      );

      await expect(
        getChangelog.execute({ changelogId: 'nonexistent_123' }, client)
      ).rejects.toThrow('not found');
    });

    it('handles API errors gracefully', async () => {
      const client = createFeaturebaseClient({ apiKey: 'test-key' });
      server.use(
        http.get('https://do.featurebase.app/v2/changelogs/:id', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(
        getChangelog.execute({ changelogId: 'changelog_123' }, client)
      ).rejects.toThrow();
    });
  });
});
