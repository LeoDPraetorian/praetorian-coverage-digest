/**
 * Test Fixtures for FeatureBase API
 *
 * Provides reusable test data for unit tests.
 */

export const mockPost = {
  id: 'post_test123',
  title: 'Test Post',
  body: 'Test content for post',
  status: 'in-progress',
  boardId: 'board_test',
  createdAt: '2026-01-09T10:00:00Z',
  updatedAt: '2026-01-09T11:00:00Z',
  upvotes: 42,
  tags: ['test', 'example'],
};

export const mockChangelog = {
  id: 'changelog_test123',
  title: 'Test Changelog',
  content: 'Test changelog content',
  publishedAt: '2026-01-09T10:00:00Z',
};

export const mockArticle = {
  id: 'article_test123',
  title: 'Test Article',
  content: 'Test article content',
  category: 'getting-started',
  publishedAt: '2026-01-09T10:00:00Z',
};
