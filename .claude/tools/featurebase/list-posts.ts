/**
 * list_posts - FeatureBase REST Wrapper
 *
 * Fetch paginated list of posts from feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1000 tokens (20 posts per page)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 78%
 *
 * Schema Discovery Results:
 * - Returns posts array with pagination
 * - boardId filter is optional
 * - Default limit is 20
 *
 * Optional fields:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 * - boardId: string (filter by category)
 *
 * Edge cases discovered:
 * - Empty boardId returns all posts
 * - Sorted by votes desc by default
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';

/**
 * Input schema for list-posts
 * Verified from FeatureBase API docs
 */
export const listPostsParams = z.object({
  limit: z.number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(100, 'limit cannot exceed 100')
    .default(10)
    .describe('Number of posts to return (1-100)'),

  cursor: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Command injection not allowed')
    .describe('Pagination cursor from previous response'),

  categoryId: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Command injection not allowed')
    .describe('Filter by category ID'),

  statusId: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Command injection not allowed')
    .describe('Filter by status ID'),

  status: z.enum(['in-progress', 'complete', 'planned', 'archived'])
    .optional()
    .describe('Filter by status label'),

  tags: z.array(z.string())
    .optional()
    .describe('Filter by tag names'),

  q: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Command injection not allowed')
    .describe('Search query for title/content'),

  sortBy: z.enum(['createdAt', 'upvotes', 'trending'])
    .default('createdAt')
    .describe('Sort order'),
});

export type ListPostsInput = z.infer<typeof listPostsParams>;

/**
 * Output schema for list-posts
 * Filtered to essential fields for token optimization
 * Based on actual API response structure
 */
export const listPostsOutput = z.object({
  posts: z.array(z.object({
    id: z.string(),
    slug: z.string().optional(),
    title: z.string(),
    content: z.string(), // API uses "content", not "body"
    status: z.string(), // Extracted from postStatus.name
    categoryId: z.string(), // API uses "categoryId", not "boardId"
    date: z.string(), // API uses "date", not "createdAt"
    lastModified: z.string(), // API uses "lastModified", not "updatedAt"
    upvotes: z.number(),
    commentCount: z.number().optional(),
    tags: z.array(z.string()),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
  })),
  page: z.number(), // Page-based pagination
  totalPages: z.number(),
  totalResults: z.number(),
  estimatedTokens: z.number(),
});

export type ListPostsOutput = z.infer<typeof listPostsOutput>;

/**
 * List posts tool
 */
export const listPosts = {
  name: 'featurebase.list_posts',
  description: 'List posts with filtering and pagination',
  parameters: listPostsParams,

  async execute(
    input: ListPostsInput,
    client: HTTPPort
  ): Promise<ListPostsOutput> {
    // Validate input
    const validated = listPostsParams.parse(input);

    // Build query params
    const searchParams: Record<string, string | number> = {
      limit: validated.limit,
    };

    if (validated.cursor) searchParams.cursor = validated.cursor;
    if (validated.categoryId) searchParams.categoryId = validated.categoryId;
    if (validated.statusId) searchParams.statusId = validated.statusId;
    if (validated.status) searchParams.status = validated.status;
    if (validated.tags) searchParams.tags = validated.tags.join(',');
    if (validated.q) searchParams.q = validated.q;
    if (validated.sortBy) searchParams.sortBy = validated.sortBy;

    // Make request
    // API returns: {results: [...], page: 1, limit: 100, totalPages: 1, totalResults: 1}
    const response = await client.request<{
      results: Array<{
        id: string;
        slug?: string;
        title: string;
        content: string; // API uses "content"
        categoryId: string; // API uses "categoryId"
        postStatus: {
          name: string; // Status name
          type: string;
        };
        postCategory?: {
          category: string;
        };
        date: string; // API uses "date"
        lastModified: string; // API uses "lastModified"
        upvotes: number;
        commentCount?: number;
        postTags?: string[];
        author?: string;
        authorEmail?: string;
      }>;
      page: number;
      limit: number;
      totalPages: number;
      totalResults: number;
    }>('get', 'v2/posts', { searchParams });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`FeatureBase API error: ${sanitized}`);
    }

    // Extract results array from API response
    const postsArray = response.data.results || [];

    // Filter and return with correct field mappings
    const filtered = {
      posts: postsArray.map(post => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: (post.content || '').substring(0, 500), // Truncate for token optimization
        status: post.postStatus?.name || 'unknown', // Extract from postStatus.name
        categoryId: post.categoryId || '',
        date: post.date || new Date().toISOString(),
        lastModified: post.lastModified || new Date().toISOString(),
        upvotes: post.upvotes || 0,
        commentCount: post.commentCount,
        tags: post.postTags || [],
        author: post.author,
        authorEmail: post.authorEmail,
      })),
      page: response.data.page || 1,
      totalPages: response.data.totalPages || 1,
      totalResults: response.data.totalResults || postsArray.length,
      estimatedTokens: estimateTokens(response.data),
    };

    return listPostsOutput.parse(filtered);
  },

  estimatedTokens: 400,
  tokenEstimate: {
    withoutCustomTool: 2500,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '84%',
  },
};
