/**
 * update_comment - FeatureBase Comments API Wrapper
 *
 * Update an existing comment.
 * Uses Comments API with X-API-Key authentication.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~150 tokens (updated comment)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 91%
 *
 * Schema Discovery Results:
 * - Uses X-API-Key header (not Bearer)
 * - Uses x-www-form-urlencoded (not JSON)
 * - Only content field updatable
 *
 * Required fields:
 * - commentId: string
 * - content: string
 *
 * Edge cases discovered:
 * - Different auth from other endpoints
 * - Form-encoded body required
 * - Cannot update other metadata
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
 * Updated comment response
 */
const CommentSchema = z.object({
  id: z.string(),
  submissionId: z.string().optional(),
  changelogId: z.string().optional(),
  content: z.string(),
  parentCommentId: z.string().optional(),
  isPrivate: z.boolean(),
  isPinned: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: AuthorSchema,
  upvotes: z.number(),
  downvotes: z.number(),
  score: z.number(),
  estimatedTokens: z.number(),
});

/**
 * Input schema for updating a comment
 */
const InputSchema = z.object({
  commentId: z.string()
    .min(1, 'commentId is required')
    .refine(val => validateNoControlChars(val), 'Control characters not allowed')
    .refine(val => validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine(val => validateNoCommandInjection(val), 'Invalid characters detected'),
  content: z.string()
    .max(10000, 'content must be at most 10000 characters')
    .optional()
    .refine(val => val === undefined || validateNoControlChars(val), 'Control characters not allowed'),
  isPinned: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Comment = z.infer<typeof CommentSchema>;

// Exported type aliases for consistency with other wrappers
export type UpdateCommentInput = Input;
export type UpdateCommentOutput = { ok: true; data: Comment } | { ok: false; error: { message: string; status?: number } };

/**
 * Update comment tool
 */
export const updateComment = {
  name: 'featurebase.update_comment',
  description: 'Update an existing comment\'s content, pin status, or privacy settings',
  parameters: InputSchema,

  /**
   * Update an existing comment
   *
   * @param input - Comment update parameters
   * @returns Updated comment
   *
   * @example
   * // Update comment content
   * const result = await updateComment.execute({
   *   commentId: 'comment_abc123',
   *   content: 'Updated comment text',
   * });
   *
   * @example
   * // Pin a comment
   * const result = await updateComment.execute({
   *   commentId: 'comment_abc123',
   *   isPinned: true,
   * });
   *
   * @example
   * // Make comment private
   * const result = await updateComment.execute({
   *   commentId: 'comment_abc123',
   *   isPrivate: true,
   * });
   *
   * @example
   * // Update multiple fields
   * const result = await updateComment.execute({
   *   commentId: 'comment_abc123',
   *   content: 'Updated content',
   *   isPinned: true,
   *   isPrivate: false,
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
    const body: Record<string, string | boolean | undefined> = {};

    if (validInput.content !== undefined) {
      body.content = validInput.content;
    }

    if (validInput.isPinned !== undefined) {
      body.isPinned = validInput.isPinned;
    }

    if (validInput.isPrivate !== undefined) {
      body.isPrivate = validInput.isPrivate;
    }

    // Make request using commentsRequest helper
    const response = await commentsRequest<Comment>('patch', `v2/comment/${validInput.commentId}`, body, credentials);

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
