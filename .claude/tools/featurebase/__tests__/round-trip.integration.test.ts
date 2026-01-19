/**
 * Round-trip integration test
 * Verifies that data survives: API → markdown → parsing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncToMarkdown } from '../sync-to-markdown.js';
import type { HTTPPort } from '../../config/lib/http-client.js';
import { parseFrontmatter } from '../internal/frontmatter.js';
import { serializeFrontmatter } from '../internal/frontmatter.js';
import fs from 'fs/promises';
import path from 'path';

describe('Round-trip sync', () => {
  const testDir = '/tmp/featurebase-roundtrip-test';
  let mockClient: HTTPPort;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    mockClient = {
      request: vi.fn(),
    } as unknown as HTTPPort;
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('preserves post data through API → markdown → parse round-trip', async () => {
    await fs.mkdir(path.join(testDir, 'posts'), { recursive: true });

    // Mock list-posts response
    vi.mocked(mockClient.request).mockResolvedValueOnce({
      ok: true,
      data: {
        results: [
          {
            id: 'post_roundtrip_123',
            slug: 'round-trip-test-post',
            title: 'Round-Trip Test Post',
            content: '# Test Content\n\nThis is a test post for round-trip verification.',
            postStatus: {
              name: 'in-progress',
              type: 'status',
            },
            categoryId: 'board_test',
            date: '2026-01-12T10:00:00Z',
            lastModified: '2026-01-12T11:00:00Z',
            upvotes: 42,
            commentCount: 0,
            postTags: ['test', 'round-trip'],
          },
        ],
        page: 1,
        limit: 100,
        totalPages: 1,
        totalResults: 1,
      },
      meta: { status: 200, durationMs: 100, retries: 0, estimatedTokens: 100 },
    });

    // Step 1: Sync from API to markdown
    const syncResult = await syncToMarkdown(
      { outputDir: testDir, types: ['posts'] },
      mockClient
    );

    expect(syncResult.filesWritten).toBe(1);

    // Step 2: Read markdown file
    const files = await fs.readdir(path.join(testDir, 'posts'));
    expect(files.length).toBe(1);

    const fileContent = await fs.readFile(
      path.join(testDir, 'posts', files[0]),
      'utf-8'
    );

    // Step 3: Parse frontmatter
    const { data: frontmatter, content: body } = parseFrontmatter(fileContent);

    // Step 4: Verify all data preserved
    expect(frontmatter.featurebaseId).toBe('post_roundtrip_123');
    expect(frontmatter.title).toBe('Round-Trip Test Post');
    expect(frontmatter.status).toBe('in-progress');
    expect(frontmatter.boardId).toBe('board_test');
    expect(frontmatter.createdAt).toBe('2026-01-12T10:00:00Z');
    expect(frontmatter.updatedAt).toBe('2026-01-12T11:00:00Z');
    expect(frontmatter.upvotes).toBe(42);
    expect(frontmatter.tags).toEqual(['test', 'round-trip']);
    expect(frontmatter.syncedAt).toBeDefined();
    expect(body.trim()).toBe('# Test Content\n\nThis is a test post for round-trip verification.');

    // Step 5: Serialize back to markdown
    const remarshalled = serializeFrontmatter(frontmatter, body);
    const { data: reparsed, content: reparsedBody } = parseFrontmatter(remarshalled);

    // Step 6: Verify data survived remarshalling
    expect(reparsed.featurebaseId).toBe(frontmatter.featurebaseId);
    expect(reparsed.title).toBe(frontmatter.title);
    expect(reparsed.status).toBe(frontmatter.status);
    expect(reparsedBody.trim()).toBe(body.trim());
  });

  it('preserves changelog data through markdown round-trip', async () => {
    await fs.mkdir(path.join(testDir, 'changelog'), { recursive: true });

    vi.mocked(mockClient.request).mockResolvedValueOnce({
      ok: true,
      data: {
        results: [
          {
            id: 'changelog_test456',
            title: 'Test Changelog',
            content: '## New Features\n\n- Feature A',
            publishedAt: '2026-01-12T10:00:00Z',
            updatedAt: '2026-01-12T11:00:00Z',
            tags: ['release'],
          },
        ],
        page: 1,
        totalResults: 1,
      },
      meta: { status: 200, durationMs: 100, retries: 0, estimatedTokens: 100 },
    });

    await syncToMarkdown(
      { outputDir: testDir, types: ['changelog'] },
      mockClient
    );

    const files = await fs.readdir(path.join(testDir, 'changelog'));
    expect(files.length).toBe(1);

    const fileContent = await fs.readFile(
      path.join(testDir, 'changelog', files[0]),
      'utf-8'
    );
    const { data: frontmatter, content: body } = parseFrontmatter(fileContent);

    expect(frontmatter.featurebaseId).toBe('changelog_test456');
    expect(frontmatter.title).toBe('Test Changelog');
    expect(frontmatter.tags).toEqual(['release']);
    expect(body.trim()).toBe('## New Features\n\n- Feature A');

    // Verify remarshalling preserves data
    const remarshalled = serializeFrontmatter(frontmatter, body);
    const { data: reparsed } = parseFrontmatter(remarshalled);
    expect(reparsed.featurebaseId).toBe(frontmatter.featurebaseId);
  });

  it('preserves article data through markdown round-trip', async () => {
    await fs.mkdir(path.join(testDir, 'articles'), { recursive: true });

    vi.mocked(mockClient.request).mockResolvedValueOnce({
      ok: true,
      data: {
        results: [
          {
            id: 'article_test789',
            title: 'Test Article',
            body: '# Article Content',
            category: 'guides',
            slug: 'test-article',
            publishedAt: '2026-01-12T10:00:00Z',
            createdAt: '2026-01-12T10:00:00Z',
            updatedAt: '2026-01-12T11:00:00Z',
          },
        ],
        page: 1,
        totalResults: 1,
      },
      meta: { status: 200, durationMs: 100, retries: 0, estimatedTokens: 100 },
    });

    await syncToMarkdown(
      { outputDir: testDir, types: ['articles'] },
      mockClient
    );

    const files = await fs.readdir(path.join(testDir, 'articles'));
    expect(files.length).toBe(1);

    const fileContent = await fs.readFile(
      path.join(testDir, 'articles', files[0]),
      'utf-8'
    );
    const { data: frontmatter, content: body } = parseFrontmatter(fileContent);

    expect(frontmatter.featurebaseId).toBe('article_test789');
    expect(frontmatter.title).toBe('Test Article');
    expect(frontmatter.category).toBe('guides');
    expect(frontmatter.slug).toBe('test-article');
    expect(body.trim()).toBe('# Article Content');

    // Verify remarshalling preserves data
    const remarshalled = serializeFrontmatter(frontmatter, body);
    const { data: reparsed } = parseFrontmatter(remarshalled);
    expect(reparsed.featurebaseId).toBe(frontmatter.featurebaseId);
    expect(reparsed.title).toBe(frontmatter.title);
  });
});
