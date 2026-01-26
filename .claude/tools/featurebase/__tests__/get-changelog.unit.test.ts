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
import { createFeaturebaseClientAsync } from '../client.js';
import type { SecretsProvider, HTTPPort } from '../../config/lib/index.js';

// Setup MSW server with FeatureBase handlers
const server = setupServer(...featurebaseHandlers);

// Create test client with mock credentials (async pattern)
const mockProvider: SecretsProvider = {
  name: 'test',
  getSecret: async () => ({ ok: true, value: 'test-key' })
};

let testClient: HTTPPort;

beforeAll(async () => {
  server.listen();
  testClient = await createFeaturebaseClientAsync(mockProvider);
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('getChangelog', () => {
  it('fetches changelog by ID', async () => {
    const result = await getChangelog.execute({ changelogId: 'changelog_123' }, testClient);

    expect(result.entry.id).toBe('changelog_123');
    expect(result.entry.title).toBe('Test Changelog');
    expect(result.entry.content).toBe('Test changelog content');
    expect(result.entry.publishedAt).toBe('2026-01-09T10:00:00Z');
    expect(result.entry.tags).toEqual(['feature', 'update']);
  });

  it('validates changelogId is required', async () => {
    await expect(
      getChangelog.execute({ changelogId: '' }, testClient)
    ).rejects.toThrow('changelogId is required');
  });

  it('validates changelogId contains no control characters', async () => {
    await expect(
      getChangelog.execute({ changelogId: 'test\n123' }, testClient)
    ).rejects.toThrow('Control characters not allowed');
  });

  describe('error handling', () => {
    it('handles 404 not found', async () => {
      server.use(
        http.get('https://do.featurebase.app/v2/changelogs/:id', () => {
          return HttpResponse.json(
            { error: 'Changelog not found' },
            { status: 404 }
          );
        })
      );

      await expect(
        getChangelog.execute({ changelogId: 'nonexistent_123' }, testClient)
      ).rejects.toThrow('not found');
    });

    it('handles API errors gracefully', async () => {
      server.use(
        http.get('https://do.featurebase.app/v2/changelogs/:id', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(
        getChangelog.execute({ changelogId: 'changelog_123' }, testClient)
      ).rejects.toThrow();
    });
  });
});
