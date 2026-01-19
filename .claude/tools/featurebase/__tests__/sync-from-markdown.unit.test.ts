import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncFromMarkdown } from '../sync-from-markdown.js';
import type { HTTPPort } from '../../config/lib/http-client.js';
import fs from 'fs/promises';
import path from 'path';

describe('syncFromMarkdown', () => {
  const testDir = '/tmp/featurebase-sync-test';
  let mockClient: HTTPPort;

  beforeEach(async () => {
    // Setup test directory
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'posts'), { recursive: true });

    // Mock HTTP client
    mockClient = {
      request: vi.fn(),
    } as unknown as HTTPPort;

    // Create test markdown file with existing featurebaseId
    const existingMarkdown = `---
featurebaseId: post_test123
title: Test Post
status: in-progress
categoryId: board_test
createdAt: 2026-01-12T10:00:00Z
updatedAt: 2026-01-12T10:00:00Z
upvotes: 42
tags:
  - test
---

# Test Post

This is the content.`;

    await fs.writeFile(
      path.join(testDir, 'posts', 'post_test123-test-post.md'),
      existingMarkdown,
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('syncs markdown files to FeatureBase (updates existing)', async () => {
    // Mock successful get (for conflict detection) and update (HTTPResult format)
    vi.mocked(mockClient.request)
      .mockResolvedValueOnce({
        // First call: get-post for conflict detection
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'Old content',
          updatedAt: '2026-01-12T09:00:00Z', // Older than local (2026-01-12T10:00:00Z)
          status: 'in-progress',
          statusId: 'status_1',
          categoryId: 'board_test',
          boardName: 'Test Board',
          createdAt: '2026-01-12T09:00:00Z',
          publishedAt: null,
          upvotes: 42,
          commentCount: 5,
          tags: ['test'],
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      })
      .mockResolvedValueOnce({
        // Second call: update-post
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'This is the content.',
          updatedAt: '2026-01-12T10:00:00Z',
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      });

    const result = await syncFromMarkdown(
      {
        inputDir: testDir,
        types: ['posts'],
      },
      mockClient
    );

    expect(result.filesProcessed).toBe(1);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify both get-post and update-post were called
    expect(mockClient.request).toHaveBeenCalledTimes(2);
    expect(mockClient.request).toHaveBeenNthCalledWith(1, 'get', 'v2/posts/post_test123');
    expect(mockClient.request).toHaveBeenNthCalledWith(
      2,
      'put',
      'v2/posts/post_test123',
      expect.objectContaining({
        json: expect.objectContaining({
          title: 'Test Post',
          content: expect.stringContaining('This is the content.'),
        }),
      })
    );
  });

  it('creates new post if no featurebaseId in frontmatter', async () => {
    // Create markdown file without featurebaseId
    const newMarkdown = `---
title: New Post
status: in-progress
categoryId: board_test
---

New content`;

    await fs.writeFile(
      path.join(testDir, 'posts', 'new-post.md'),
      newMarkdown,
      'utf-8'
    );

    // Mock three calls (files processed alphabetically: new-post.md, then post_test123-test-post.md)
    vi.mocked(mockClient.request)
      .mockResolvedValueOnce({
        // First call: create new post (new-post.md processed first alphabetically)
        ok: true,
        data: {
          id: 'post_new456',
          title: 'New Post',
          content: 'New content',
          categoryId: 'board_test',
          createdAt: '2026-01-13T10:00:00Z',
          updatedAt: '2026-01-13T10:00:00Z',
        },
        meta: {
          status: 201,
          durationMs: 150,
          retries: 0,
          estimatedTokens: 60,
        },
      })
      .mockResolvedValueOnce({
        // Second call: get-post for conflict detection (post_test123-test-post.md processed second)
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'Old content',
          updatedAt: '2026-01-12T09:00:00Z', // Older than local (2026-01-12T10:00:00Z)
          status: 'in-progress',
          statusId: 'status_1',
          categoryId: 'board_test',
          boardName: 'Test Board',
          createdAt: '2026-01-12T09:00:00Z',
          publishedAt: null,
          upvotes: 42,
          commentCount: 5,
          tags: ['test'],
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      })
      .mockResolvedValueOnce({
        // Third call: update existing post
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'This is the content.',
          updatedAt: '2026-01-12T10:00:00Z',
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      });

    const result = await syncFromMarkdown(
      {
        inputDir: testDir,
        types: ['posts'],
      },
      mockClient
    );

    expect(result.filesProcessed).toBe(2); // Both files processed
    expect(result.created).toBe(1); // New post created
    expect(result.updated).toBe(1); // Existing post updated

    // Verify file was updated with new ID
    const updatedContent = await fs.readFile(
      path.join(testDir, 'posts', 'new-post.md'),
      'utf-8'
    );
    expect(updatedContent).toContain('featurebaseId: post_new456');
  });

  it('handles errors gracefully', async () => {
    // Mock failed update
    vi.mocked(mockClient.request).mockRejectedValue(new Error('API Error'));

    const result = await syncFromMarkdown(
      {
        inputDir: testDir,
        types: ['posts'],
      },
      mockClient
    );

    expect(result.filesProcessed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      file: 'post_test123-test-post.md',
      error: expect.stringContaining('API Error'),
    });
  });

  it('skips non-markdown files', async () => {
    // Create a non-markdown file
    await fs.writeFile(path.join(testDir, 'posts', 'README.txt'), 'Not markdown', 'utf-8');

    // Mock to verify it's only called for .md file (both get and update calls)
    vi.mocked(mockClient.request)
      .mockResolvedValueOnce({
        // First call: get-post for conflict detection
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'Old content',
          updatedAt: '2026-01-12T09:00:00Z', // Older than local (2026-01-12T10:00:00Z)
          status: 'in-progress',
          statusId: 'status_1',
          categoryId: 'board_test',
          boardName: 'Test Board',
          createdAt: '2026-01-12T09:00:00Z',
          publishedAt: null,
          upvotes: 42,
          commentCount: 5,
          tags: ['test'],
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      })
      .mockResolvedValueOnce({
        // Second call: update-post
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'This is the content.',
          updatedAt: '2026-01-12T10:00:00Z',
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      });

    const result = await syncFromMarkdown(
      {
        inputDir: testDir,
        types: ['posts'],
      },
      mockClient
    );

    // Only the .md file should be processed
    expect(result.filesProcessed).toBe(1);
    expect(mockClient.request).toHaveBeenCalledTimes(2); // get + update
  });

  describe('changelog support', () => {
    beforeEach(async () => {
      await fs.mkdir(path.join(testDir, 'changelog'), { recursive: true });
    });

    it('syncs changelog entries to FeatureBase (updates existing)', async () => {
      const changelogMarkdown = `---
featurebaseId: changelog_test456
title: Test Changelog
publishedAt: 2026-01-12T10:00:00Z
updatedAt: 2026-01-12T10:00:00Z
tags:
  - feature
  - release
---

## What's New

New features and improvements.`;

      await fs.writeFile(
        path.join(testDir, 'changelog', 'changelog_test456-test-changelog.md'),
        changelogMarkdown,
        'utf-8'
      );

      vi.mocked(mockClient.request).mockResolvedValue({
        ok: true,
        data: {
          id: 'changelog_test456',
          title: 'Test Changelog',
          content: "## What's New\n\nNew features and improvements.",
          publishedAt: '2026-01-12T10:00:00Z',
          updatedAt: '2026-01-12T10:00:00Z',
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      });

      const result = await syncFromMarkdown(
        {
          inputDir: testDir,
          types: ['changelog'],
        },
        mockClient
      );

      expect(result.filesProcessed).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('creates new changelog entry if no featurebaseId', async () => {
      const newChangelogMarkdown = `---
title: New Release
publishedAt: 2026-01-13T10:00:00Z
tags:
  - release
---

## New Release

Major update released.`;

      await fs.writeFile(
        path.join(testDir, 'changelog', 'new-release.md'),
        newChangelogMarkdown,
        'utf-8'
      );

      vi.mocked(mockClient.request).mockResolvedValue({
        ok: true,
        data: {
          id: 'changelog_new789',
          title: 'New Release',
          content: '## New Release\n\nMajor update released.',
          publishedAt: '2026-01-13T10:00:00Z',
          createdAt: '2026-01-13T10:00:00Z',
          updatedAt: '2026-01-13T10:00:00Z',
        },
        meta: {
          status: 201,
          durationMs: 150,
          retries: 0,
          estimatedTokens: 60,
        },
      });

      const result = await syncFromMarkdown(
        {
          inputDir: testDir,
          types: ['changelog'],
        },
        mockClient
      );

      expect(result.filesProcessed).toBe(1);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);

      // Verify file was updated with new ID
      const updatedContent = await fs.readFile(
        path.join(testDir, 'changelog', 'new-release.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('featurebaseId: changelog_new789');
    });
  });

  it('detects conflicts when API has newer updatedAt', async () => {
    // Mock get-post to return newer timestamp than local file
    vi.mocked(mockClient.request)
      .mockResolvedValueOnce({
        // First call: get-post (fetch current state)
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'Old content',
          updatedAt: '2026-01-13T12:00:00Z', // Newer than local (2026-01-12T10:00:00Z)
          status: 'in-progress',
          statusId: 'status_1',
          categoryId: 'board_test',
          boardName: 'Test Board',
          createdAt: '2026-01-12T09:00:00Z',
          publishedAt: null,
          upvotes: 42,
          commentCount: 5,
          tags: ['test'],
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      });

    const result = await syncFromMarkdown(
      {
        inputDir: testDir,
        types: ['posts'],
      },
      mockClient
    );

    // Should detect conflict and skip update
    expect(result.filesProcessed).toBe(1);
    expect(result.updated).toBe(0); // Not updated due to conflict
    expect(result.conflicts).toBeDefined();
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts![0]).toMatchObject({
      file: 'post_test123-test-post.md',
      reason: expect.stringContaining('newer'),
    });

    // Should only call get-post, not update-post
    expect(mockClient.request).toHaveBeenCalledTimes(1);
    expect(mockClient.request).toHaveBeenCalledWith('get', 'v2/posts/post_test123');
  });

  it('updates when local has newer or equal updatedAt', async () => {
    // Mock get-post to return older timestamp
    vi.mocked(mockClient.request)
      .mockResolvedValueOnce({
        // First call: get-post
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'Old content',
          updatedAt: '2026-01-12T09:00:00Z', // Older than local (2026-01-12T10:00:00Z)
          status: 'in-progress',
          statusId: 'status_1',
          categoryId: 'board_test',
          boardName: 'Test Board',
          createdAt: '2026-01-12T09:00:00Z',
          publishedAt: null,
          upvotes: 42,
          commentCount: 5,
          tags: ['test'],
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      })
      .mockResolvedValueOnce({
        // Second call: update-post
        ok: true,
        data: {
          id: 'post_test123',
          title: 'Test Post',
          content: 'This is the content.',
          updatedAt: '2026-01-13T10:00:00Z',
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      });

    const result = await syncFromMarkdown(
      {
        inputDir: testDir,
        types: ['posts'],
      },
      mockClient
    );

    // Should update (no conflict)
    expect(result.filesProcessed).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.conflicts).toEqual([]);

    // Should call both get and update
    expect(mockClient.request).toHaveBeenCalledTimes(2);
  });

  describe('articles support', () => {
    beforeEach(async () => {
      await fs.mkdir(path.join(testDir, 'articles'), { recursive: true });
    });

    it('syncs articles to FeatureBase (updates existing)', async () => {
      const articleMarkdown = `---
featurebaseId: article_test789
title: Test Article
category: guides
slug: test-article-slug
publishedAt: 2026-01-12T10:00:00Z
updatedAt: 2026-01-12T10:00:00Z
---

# Test Article

This is the article content.`;

      await fs.writeFile(
        path.join(testDir, 'articles', 'article_test789-test-article.md'),
        articleMarkdown,
        'utf-8'
      );

      vi.mocked(mockClient.request).mockResolvedValue({
        ok: true,
        data: {
          id: 'article_test789',
          title: 'Test Article',
          content: '# Test Article\n\nThis is the article content.',
          category: 'guides',
          slug: 'test-article-slug',
          publishedAt: '2026-01-12T10:00:00Z',
          updatedAt: '2026-01-12T10:00:00Z',
        },
        meta: {
          status: 200,
          durationMs: 100,
          retries: 0,
          estimatedTokens: 50,
        },
      });

      const result = await syncFromMarkdown(
        {
          inputDir: testDir,
          types: ['articles'],
        },
        mockClient
      );

      expect(result.filesProcessed).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('creates new article if no featurebaseId', async () => {
      const newArticleMarkdown = `---
title: New Article
category: tutorials
slug: new-article
publishedAt: 2026-01-13T10:00:00Z
---

# New Article

Tutorial content here.`;

      await fs.writeFile(
        path.join(testDir, 'articles', 'new-article.md'),
        newArticleMarkdown,
        'utf-8'
      );

      vi.mocked(mockClient.request).mockResolvedValue({
        ok: true,
        data: {
          id: 'article_new999',
          title: 'New Article',
          content: '# New Article\n\nTutorial content here.',
          category: 'tutorials',
          slug: 'new-article',
          publishedAt: '2026-01-13T10:00:00Z',
          updatedAt: '2026-01-13T10:00:00Z',
        },
        meta: {
          status: 201,
          durationMs: 150,
          retries: 0,
          estimatedTokens: 60,
        },
      });

      const result = await syncFromMarkdown(
        {
          inputDir: testDir,
          types: ['articles'],
        },
        mockClient
      );

      expect(result.filesProcessed).toBe(1);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);

      // Verify file was updated with new ID
      const updatedContent = await fs.readFile(
        path.join(testDir, 'articles', 'new-article.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('featurebaseId: article_new999');
    });
  });
});
