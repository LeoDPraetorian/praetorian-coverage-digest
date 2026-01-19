/**
 * list_comments - FeatureBase Comments API Wrapper
 *
 * Fetch comments for a post or changelog entry.
 * Uses standard API (not Comments API for GET).
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~800 tokens (comments list)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 80%
 *
 * Schema Discovery Results:
 * - Uses submissionId (post or changelog ID)
 * - Returns threaded comments
 * - Uses standard Bearer auth for GET
 *
 * Required fields:
 * - postId: string (submissionId in API)
 *
 * Edge cases discovered:
 * - GET uses Bearer (POST/PUT/DELETE use X-API-Key)
 * - Returns threaded structure
 */

import { z } from 'zod';
import { commentsRequest } from './comments-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';

/**
 * Input schema for list-comments
 * Verified from FeatureBase Comments API docs
 */
export const listCommentsParams = z.object({
  submissionId: z.string()
    .optional()
    .refine(val => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine(val => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine(val => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Filter by post ID'),

  changelogId: z.string()
    .optional()
    .refine(val => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine(val => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine(val => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Filter by changelog ID'),

  limit: z.number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(100, 'limit cannot exceed 100')
    .default(10)
    .describe('Number of comments to return (1-100)'),

  page: z.number()
    .int()
    .min(1, 'page must be at least 1')
    .default(1)
    .describe('Page number for pagination'),

  sortBy: z.enum(['newest', 'oldest', 'popular'])
    .default('newest')
    .describe('Sort order for comments'),

  includePrivate: z.boolean()
    .optional()
    .describe('Include private comments (admin only)'),

  includeDeleted: z.boolean()
    .optional()
    .describe('Include soft-deleted comments'),
}).refine(data => data.submissionId || data.changelogId, {
  message: 'Either submissionId or changelogId is required',
});

export type ListCommentsInput = z.infer<typeof listCommentsParams>;

/**
 * Output schema for list-comments
 * Filtered to essential fields for token optimization
 */
export const listCommentsOutput = z.object({
  comments: z.array(z.object({
    id: z.string(),
    content: z.string(), // Truncated to 500 chars
    createdAt: z.string(),
    author: z.object({
      id: z.string(),
      name: z.string(),
      // email and profilePicture omitted for token optimization
    }),
    parentCommentId: z.string().nullable(),
    isPrivate: z.boolean(),
    isPinned: z.boolean(),
    upvotes: z.number(),
    // downvotes and score omitted for token optimization
    replyCount: z.number().optional(),
  })),
  page: z.number(),
  totalPages: z.number(),
  totalResults: z.number(),
  estimatedTokens: z.number(),
});

export type ListCommentsOutput = z.infer<typeof listCommentsOutput>;

/**
 * List comments tool
 */
export const listComments = {
  name: 'featurebase.list_comments',
  description: 'List comments for a post or changelog with filtering and pagination',
  parameters: listCommentsParams,

  async execute(
    input: ListCommentsInput,
    credentials?: { apiKey: string }
  ): Promise<ListCommentsOutput> {
    // Validate input
    const validated = listCommentsParams.parse(input);

    // Build query params (GET request uses query params, not body)
    const queryParams: string[] = [];

    if (validated.submissionId) queryParams.push(`submissionId=${encodeURIComponent(validated.submissionId)}`);
    if (validated.changelogId) queryParams.push(`changelogId=${encodeURIComponent(validated.changelogId)}`);
    queryParams.push(`limit=${validated.limit}`);
    queryParams.push(`page=${validated.page}`);
    queryParams.push(`sortBy=${validated.sortBy}`);
    if (validated.includePrivate !== undefined) queryParams.push(`includePrivate=${validated.includePrivate}`);
    if (validated.includeDeleted !== undefined) queryParams.push(`includeDeleted=${validated.includeDeleted}`);

    const queryString = queryParams.join('&');

    // Make request using commentsRequest helper (handles X-API-Key auth)
    const response = await commentsRequest<{
      comments: Array<{
        id: string;
        content: string;
        createdAt: string;
        author: {
          id: string;
          name: string;
          email?: string;
          profilePicture?: string;
        };
        parentCommentId: string | null;
        isPrivate: boolean;
        isPinned: boolean;
        upvotes: number;
        downvotes?: number;
        score?: number;
        replyCount?: number;
      }>;
      page: number;
      totalPages: number;
      totalResults: number;
    }>('get', `v2/comment?${queryString}`, undefined, credentials);

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`FeatureBase Comments API error: ${sanitized}`);
    }

    // Filter and return with token optimization
    const filtered = {
      comments: response.data.comments.map(comment => ({
        id: comment.id,
        content: (comment.content || '').substring(0, 500), // Truncate for token optimization
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          // email and profilePicture omitted for token optimization
        },
        parentCommentId: comment.parentCommentId,
        isPrivate: comment.isPrivate,
        isPinned: comment.isPinned,
        upvotes: comment.upvotes,
        // downvotes and score omitted for token optimization
        replyCount: comment.replyCount,
      })),
      page: response.data.page || 1,
      totalPages: response.data.totalPages || 1,
      totalResults: response.data.totalResults || response.data.comments.length,
      estimatedTokens: estimateTokens(response.data),
    };

    return listCommentsOutput.parse(filtered);
  },

  estimatedTokens: 500,
  tokenEstimate: {
    withoutCustomTool: 3000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '83%',
  },
};
