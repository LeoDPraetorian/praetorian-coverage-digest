import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { syncToMarkdown } from '../sync-to-markdown.js';
import { createFeaturebaseClient } from '../client.js';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import fs from 'fs/promises';
import path from 'path';

// Mock handlers for FeatureBase API
const handlers = [
  http.get('https://do.featurebase.app/v2/posts', () => {
    return HttpResponse.json({
      results: [
        {
          id: 'post_test123',
          slug: 'test-post',
          title: 'Test Post',
          content: '# Test Post Content\n\nThis is a test post.',
          postStatus: {
            name: 'in_progress',
            type: 'status',
          },
          categoryId: 'board_test',
          date: '2026-01-12T10:00:00Z',
          lastModified: '2026-01-12T10:00:00Z',
          upvotes: 42,
          commentCount: 0,
          postTags: ['test'],
        },
      ],
      page: 1,
      limit: 100,
      totalPages: 1,
      totalResults: 1,
    });
  }),
  http.get('https://do.featurebase.app/v2/changelogs', () => {
    return HttpResponse.json({
      results: [
        {
          id: 'changelog_test456',
          title: 'New Feature Released',
          content: '# New Feature\n\nWe released a new feature today.',
          publishedAt: '2026-01-13T09:00:00Z',
          updatedAt: '2026-01-13T09:30:00Z',
          tags: ['feature', 'release'],
        },
      ],
      page: 1,
      totalResults: 1,
    });
  }),
  http.get('https://do.featurebase.app/v2/help_center/articles', () => {
    return HttpResponse.json({
      results: [
        {
          id: 'article_test789',
          title: 'Getting Started Guide',
          body: '# Getting Started\n\nThis guide will help you get started.',
          slug: 'getting-started-guide',
          createdAt: '2026-01-10T08:00:00Z',
          updatedAt: '2026-01-11T10:00:00Z',
        },
      ],
      page: 1,
      totalResults: 1,
    });
  }),
];

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('syncToMarkdown', () => {
  const testDir = '/tmp/featurebase-test-sync';
  const testClient = createFeaturebaseClient({ apiKey: 'test-key' });

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'posts'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'changelog'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'articles'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('syncs posts to markdown files', async () => {
    const result = await syncToMarkdown({
      outputDir: testDir,
      types: ['posts'],
    }, testClient);

    expect(result.filesWritten).toBeGreaterThan(0);

    const files = await fs.readdir(path.join(testDir, 'posts'));
    expect(files.length).toBeGreaterThan(0);

    const content = await fs.readFile(
      path.join(testDir, 'posts', files[0]),
      'utf-8'
    );

    expect(content).toContain('---');
    expect(content).toContain('featurebaseId:');
    expect(content).toContain('title:');
  });

  it('uses slug in filename', async () => {
    await syncToMarkdown({
      outputDir: testDir,
      types: ['posts'],
    }, testClient);

    const files = await fs.readdir(path.join(testDir, 'posts'));
    expect(files[0]).toMatch(/^post_test123-test-post\.md$/);
  });

  it('syncs changelog entries to markdown files', async () => {
    const result = await syncToMarkdown({
      outputDir: testDir,
      types: ['changelog'],
    }, testClient);

    expect(result.filesWritten).toBeGreaterThan(0);

    const files = await fs.readdir(path.join(testDir, 'changelog'));
    expect(files.length).toBeGreaterThan(0);

    const content = await fs.readFile(
      path.join(testDir, 'changelog', files[0]),
      'utf-8'
    );

    expect(content).toContain('---');
    expect(content).toContain('featurebaseId:');
    expect(content).toContain('title:');
    expect(content).toContain('New Feature Released');
  });

  it('syncs articles to markdown files', async () => {
    const result = await syncToMarkdown({
      outputDir: testDir,
      types: ['articles'],
    }, testClient);

    expect(result.filesWritten).toBeGreaterThan(0);

    const files = await fs.readdir(path.join(testDir, 'articles'));
    expect(files.length).toBeGreaterThan(0);

    const content = await fs.readFile(
      path.join(testDir, 'articles', files[0]),
      'utf-8'
    );

    expect(content).toContain('---');
    expect(content).toContain('featurebaseId:');
    expect(content).toContain('category:');
    expect(content).toContain('Getting Started Guide');
  });

  it('syncs multiple types in one call', async () => {
    const result = await syncToMarkdown({
      outputDir: testDir,
      types: ['posts', 'changelog', 'articles'],
    }, testClient);

    expect(result.filesWritten).toBe(3);

    const postFiles = await fs.readdir(path.join(testDir, 'posts'));
    const changelogFiles = await fs.readdir(path.join(testDir, 'changelog'));
    const articleFiles = await fs.readdir(path.join(testDir, 'articles'));

    expect(postFiles.length).toBe(1);
    expect(changelogFiles.length).toBe(1);
    expect(articleFiles.length).toBe(1);
  });

  it('handles directory creation gracefully', async () => {
    // Test that directories are created if they don't exist
    const newTestDir = '/tmp/featurebase-test-new';

    try {
      const result = await syncToMarkdown({
        outputDir: newTestDir,
        types: ['posts'],
      }, testClient);

      expect(result.filesWritten).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);

      // Verify directory was created
      const files = await fs.readdir(path.join(newTestDir, 'posts'));
      expect(files.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(newTestDir, { recursive: true, force: true });
    }
  });

  it('handles null content gracefully with defensive conversion', async () => {
    // Mock a post with null content - should be handled defensively
    server.use(
      http.get('https://do.featurebase.app/v2/posts', () => {
        return HttpResponse.json({
          results: [
            {
              id: 'post_test123',
              slug: 'test-post',
              title: 'Test Post',
              content: null, // Null content - should be converted to empty string
              postStatus: {
                name: 'in_progress',
                type: 'status',
              },
              categoryId: 'board_test',
              date: '2026-01-12T10:00:00Z',
              lastModified: '2026-01-12T10:00:00Z',
              upvotes: 42,
              commentCount: 0,
              postTags: ['test'],
            },
          ],
          page: 1,
          limit: 100,
          totalPages: 1,
          totalResults: 1,
        });
      })
    );

    const result = await syncToMarkdown({
      outputDir: testDir,
      types: ['posts'],
    }, testClient);

    // Defensive handling should convert null to empty string - no errors
    expect(result.errors).toEqual([]);
    expect(result.filesWritten).toBe(1);

    // Verify file was created with empty content
    const files = await fs.readdir(path.join(testDir, 'posts'));
    expect(files.length).toBe(1);

    const content = await fs.readFile(
      path.join(testDir, 'posts', files[0]),
      'utf-8'
    );

    // Should have frontmatter but empty content body
    expect(content).toContain('---');
    expect(content).toContain('featurebaseId:');
    expect(content).toContain('title: Test Post');
  });
});
