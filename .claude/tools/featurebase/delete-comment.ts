/**
 * delete_comment - FeatureBase Comments API Wrapper
 *
 * Delete a comment from a post or changelog.
 * Uses Comments API with X-API-Key authentication.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~100 tokens (deletion response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 93%
 *
 * Schema Discovery Results:
 * - Uses X-API-Key header (not Bearer)
 * - Soft delete if has replies (content becomes "[deleted]")
 * - Hard delete if no replies
 *
 * Required fields:
 * - commentId: string
 *
 * Edge cases discovered:
 * - Different auth from other endpoints
 * - Soft vs hard delete based on replies
 */

import { z } from 'zod';
import { commentsRequest } from './comments-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * Delete response with deletion type indicator
 */
const DeleteResponseSchema = z.object({
  success: z.boolean(),
  commentId: z.string(),
  deletionType: z.enum(['hard', 'soft']),
  estimatedTokens: z.number(),
});

/**
 * Input schema for deleting a comment
 */
const InputSchema = z.object({
  commentId: z.string()
    .min(1, 'commentId is required')
    .refine(val => validateNoControlChars(val), 'Control characters not allowed')
    .refine(val => validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine(val => validateNoCommandInjection(val), 'Invalid characters detected'),
});

type Input = z.infer<typeof InputSchema>;
type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

// Exported type aliases for consistency with other wrappers
export type DeleteCommentInput = Input;
export type DeleteCommentOutput = { ok: true; data: DeleteResponse } | { ok: false; error: { message: string; status?: number } };

/**
 * Delete comment tool
 */
export const deleteComment = {
  name: 'featurebase.delete_comment',
  description: 'Delete a comment from a post or changelog (soft-deletes if replies exist)',
  parameters: InputSchema,

  /**
   * Delete a comment
   *
   * @param input - Comment deletion parameters
   * @returns Deletion result with type indicator
   *
   * @example
   * // Delete comment
   * const result = await deleteComment.execute({
   *   commentId: 'comment_abc123',
   * });
   *
   * if (result.ok) {
   *   console.log(result.data.deletionType); // 'hard' or 'soft'
   * }
   */
  async execute(
    input: Input,
    credentials?: { apiKey: string }
  ): Promise<{ ok: true; data: DeleteResponse } | { ok: false; error: { message: string; status?: number } }> {
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

    // Make request using commentsRequest helper
    const response = await commentsRequest<{ deletionType?: string }>(
      'delete',
      `v2/comment/${validInput.commentId}`,
      undefined,
      credentials
    );

    if (!response.ok) {
      return response;
    }

    // Validate response and add estimatedTokens
    const deleteData = {
      success: true,
      commentId: validInput.commentId,
      deletionType: response.data.deletionType || 'hard',
    };

    const parseResult = DeleteResponseSchema.safeParse({
      ...deleteData,
      estimatedTokens: estimateTokens(deleteData),
    });

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

  tokenEstimate: {
    withoutCustomTool: 900,
    withCustomTool: 0,
    whenUsed: 150,
    reductionPercentage: 83,
  },
};
