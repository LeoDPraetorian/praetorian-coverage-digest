/**
 * create_comment - FeatureBase Comments API Wrapper
 *
 * Create a new comment on a post or changelog entry.
 * Uses Comments API with X-API-Key authentication.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (comment creation response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 90%
 *
 * Schema Discovery Results:
 * - Uses submissionId (not postId)
 * - Uses X-API-Key header (not Bearer)
 * - Uses x-www-form-urlencoded (not JSON)
 * - parentCommentId enables threaded replies
 *
 * Required fields:
 * - submissionId: string (post or changelog ID)
 * - content: string (comment text)
 *
 * Optional fields:
 * - parentCommentId: string (for replies)
 * - private: boolean (default false)
 *
 * Edge cases discovered:
 * - Different auth from other endpoints
 * - Form-encoded body required
 */

import { z } from 'zod';
import { commentsRequest } from './comments-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * Comment author information
 */
const AuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

/**
 * Created comment response
 */
const CommentSchema = z.object({
  id: z.string(),
  submissionId: z.string().optional(),
  changelogId: z.string().optional(),
  content: z.string(),
  parentCommentId: z.string().optional(),
  isPrivate: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: AuthorSchema,
  upvotes: z.number(),
  downvotes: z.number(),
  score: z.number(),
  estimatedTokens: z.number(),
});

/**
 * Input schema for creating a comment
 */
const InputSchema = z
  .object({
    submissionId: z.string()
      .optional()
      .refine(val => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
      .refine(val => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
      .refine(val => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected'),
    changelogId: z.string()
      .optional()
      .refine(val => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
      .refine(val => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
      .refine(val => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected'),
    content: z.string()
      .min(1)
      .max(10000)
      .refine(val => validateNoControlChars(val), 'Control characters not allowed'),
    parentCommentId: z.string()
      .optional()
      .refine(val => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
      .refine(val => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
      .refine(val => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected'),
    isPrivate: z.boolean().optional(),
  })
  .refine((data) => data.submissionId || data.changelogId, {
    message: 'Either submissionId or changelogId is required',
  });

type Input = z.infer<typeof InputSchema>;
type Comment = z.infer<typeof CommentSchema>;

// Exported type aliases for consistency with other wrappers
export type CreateCommentInput = Input;
export type CreateCommentOutput = { ok: true; data: Comment } | { ok: false; error: { message: string; status?: number } };

/**
 * Create comment tool
 */
export const createComment = {
  name: 'featurebase.create_comment',
  description: 'Create a new comment on a post or changelog with support for threaded replies and private comments',
  parameters: InputSchema,

  /**
   * Create a comment on a post or changelog
   *
   * @param input - Comment creation parameters
   * @returns Created comment
   *
   * @example
   * // Create comment on post
   * const result = await createComment.execute({
   *   submissionId: 'post_abc123',
   *   content: 'This is a great feature!',
   * });
   *
   * @example
   * // Create threaded reply
   * const result = await createComment.execute({
   *   submissionId: 'post_abc123',
   *   content: 'I agree!',
   *   parentCommentId: 'comment_parent123',
   * });
   *
   * @example
   * // Create private comment (admin-only)
   * const result = await createComment.execute({
   *   submissionId: 'post_abc123',
   *   content: 'Internal note',
   *   isPrivate: true,
   * });
   */
  async execute(
    input: Input,
    credentials?: { apiKey: string }
  ): Promise<{ ok: true; data: Comment } | { ok: false; error: { message: string; status?: number } }> {
    // Validate input
    const validation = InputSchema.safeParse(input);
    if (!validation.success) {
      return {
        ok: false,
        error: {
          message: validation.error.errors.map((e) => e.message).join(', '),
        },
      };
    }

    const validInput = validation.data;

    // Build form data body
    const body: Record<string, string | boolean | undefined> = {
      content: validInput.content,
    };

    if (validInput.submissionId) {
      body.submissionId = validInput.submissionId;
    }

    if (validInput.changelogId) {
      body.changelogId = validInput.changelogId;
    }

    if (validInput.parentCommentId) {
      body.parentCommentId = validInput.parentCommentId;
    }

    if (validInput.isPrivate !== undefined) {
      body.isPrivate = validInput.isPrivate;
    }

    // Make request using commentsRequest helper
    const response = await commentsRequest<Comment>('post', 'v2/comment', body, credentials);

    if (!response.ok) {
      return response;
    }

    // Validate response and add estimatedTokens
    const commentWithTokens = {
      ...response.data,
      estimatedTokens: estimateTokens(response.data),
    };

    const parseResult = CommentSchema.safeParse(commentWithTokens);
    if (!parseResult.success) {
      return {
        ok: false,
        error: {
          message: `Invalid response format: ${parseResult.error.message}`,
        },
      };
    }

    return {
      ok: true,
      data: parseResult.data,
    };
  },


  estimatedTokens: 300,
  tokenEstimate: {
    withoutCustomTool: 1800,
    withCustomTool: 0,
    whenUsed: 300,
    reductionPercentage: 83,
  },
};
