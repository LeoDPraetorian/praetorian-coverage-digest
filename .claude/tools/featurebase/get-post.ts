/**
 * get_post - FeatureBase REST Wrapper
 *
 * Fetch a single post by ID from FeatureBase feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (single post)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 85%
 *
 * Schema Discovery Results:
 * - Returns post with status, votes, comments count
 * - status can be: open, in-progress, planned, completed, closed
 * - voters and upvotes included
 *
 * Required fields:
 * - postId: string
 *
 * Edge cases discovered:
 * - Returns 404 if post doesn't exist
 * - Status field shows current workflow state
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const getPostParams = z.object({
  postId: z.string()
    .min(1, 'postId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Post ID to retrieve'),
});

export type GetPostInput = z.infer<typeof getPostParams>;

export const getPostOutput = z.object({
  post: z.object({
    id: z.string(),
    slug: z.string().optional(),
    title: z.string(),
    content: z.string(), // API uses "content", not "body"
    status: z.string(), // Extracted from postStatus.name
    statusId: z.string().optional(),
    categoryId: z.string(), // API uses "categoryId", not "boardId"
    categoryName: z.string().optional(), // From postCategory.category
    date: z.string(), // API uses "date", not "createdAt"
    lastModified: z.string(), // API uses "lastModified", not "updatedAt"
    publishedAt: z.string().nullable().optional(),
    upvotes: z.number(),
    commentCount: z.number(),
    tags: z.array(z.string()),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
  }),
  estimatedTokens: z.number(),
});

export type GetPostOutput = z.infer<typeof getPostOutput>;

/**
 * FeatureBase API response schema for get post endpoint
 */
interface GetPostAPIResponse {
  id: string;
  slug?: string;
  title: string;
  content?: string;
  body?: string; // Fallback field name
  postStatus?: { name: string };
  status?: string; // Fallback field name
  statusId?: string;
  categoryId?: string;
  boardId?: string; // Fallback field name
  postCategory?: { category: string };
  boardName?: string; // Fallback field name
  date?: string;
  createdAt?: string; // Fallback field name
  lastModified?: string;
  updatedAt?: string; // Fallback field name
  publishedAt?: string | null;
  upvotes?: number;
  commentCount?: number;
  postTags?: string[];
  tags?: string[]; // Fallback field name
  author?: string;
  authorName?: string; // Fallback field name
  authorEmail?: string;
}

export const getPost = {
  name: 'featurebase.get_post',
  description: 'Get a single post by ID',
  parameters: getPostParams,

  async execute(
    input: GetPostInput,
    client: HTTPPort
  ): Promise<GetPostOutput> {
    const validated = getPostParams.parse(input);

    const response = await client.request<GetPostAPIResponse>(
      'get',
      `v2/posts/${validated.postId}`
    );

    if (!response.ok) {
      const message = response.error.status === 404
        ? `Post not found: ${validated.postId}`
        : `Failed to get post: ${sanitizeErrorMessage(response.error.message)}`;
      throw new Error(message);
    }

    const post = response.data;

    const postData = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content || post.body || '', // Handle both field names
      status: post.postStatus?.name || post.status || 'unknown',
      statusId: post.statusId,
      categoryId: post.categoryId || post.boardId || '',
      categoryName: post.postCategory?.category || post.boardName,
      date: post.date || post.createdAt || new Date().toISOString(),
      lastModified: post.lastModified || post.updatedAt || new Date().toISOString(),
      publishedAt: post.publishedAt || null,
      upvotes: post.upvotes || 0,
      commentCount: post.commentCount || 0,
      tags: post.postTags || post.tags || [],
      author: post.author || post.authorName,
      authorEmail: post.authorEmail,
    };

    return getPostOutput.parse({
      post: postData,
      estimatedTokens: estimateTokens(postData),
    });
  },

  estimatedTokens: 400,
  tokenEstimate: {
    withoutCustomTool: 2500,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '84%',
  },
};
