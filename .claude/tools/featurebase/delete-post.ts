/**
 * delete_post - FeatureBase REST Wrapper
 *
 * Delete a post from FeatureBase feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (success response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 95%
 *
 * Schema Discovery Results:
 * - Returns success boolean
 * - Permanent deletion
 *
 * Required fields:
 * - postId: string
 *
 * Edge cases discovered:
 * - Returns 404 if post doesn't exist
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const deletePostParams = z.object({
  postId: z.string()
    .min(1, 'postId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Post ID to delete'),
});

export type DeletePostInput = z.infer<typeof deletePostParams>;

export const deletePostOutput = z.object({
  success: z.boolean(),
  postId: z.string(),
  estimatedTokens: z.number(),
});

export type DeletePostOutput = z.infer<typeof deletePostOutput>;

/**
 * FeatureBase API response schema for delete post endpoint
 */
interface DeletePostAPIResponse {
  success?: boolean;
}

export const deletePost = {
  name: 'featurebase.delete_post',
  description: 'Delete a post',
  parameters: deletePostParams,

  async execute(
    input: DeletePostInput,
    client: HTTPPort
  ): Promise<DeletePostOutput> {
    const validated = deletePostParams.parse(input);

    const response = await client.request<DeletePostAPIResponse>(
      'delete',
      `v2/posts/${validated.postId}`
    );

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to delete post: ${sanitized}`);
    }

    const resultData = {
      success: true,
      postId: validated.postId,
    };

    return deletePostOutput.parse({
      ...resultData,
      estimatedTokens: estimateTokens(resultData),
    });
  },
};
