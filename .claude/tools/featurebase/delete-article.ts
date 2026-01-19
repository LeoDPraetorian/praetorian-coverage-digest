/**
 * delete_article - FeatureBase REST Wrapper
 *
 * Delete an article from FeatureBase knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (success response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 95%
 *
 * Schema Discovery Results:
 * - Returns success boolean
 * - Permanent deletion (no soft delete)
 *
 * Required fields:
 * - articleId: string
 *
 * Edge cases discovered:
 * - Returns 404 if article doesn't exist
 * - Deletion is permanent
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const deleteArticleParams = z.object({
  articleId: z.string()
    .min(1, 'articleId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Article ID to delete'),
});

export type DeleteArticleInput = z.infer<typeof deleteArticleParams>;

export const deleteArticleOutput = z.object({
  success: z.boolean(),
  articleId: z.string(),
  estimatedTokens: z.number(),
});

export type DeleteArticleOutput = z.infer<typeof deleteArticleOutput>;

/**
 * FeatureBase API response schema for delete article endpoint
 */
interface DeleteArticleAPIResponse {
  success?: boolean;
}

export const deleteArticle = {
  name: 'featurebase.delete_article',
  description: 'Delete an article',
  parameters: deleteArticleParams,

  async execute(
    input: DeleteArticleInput,
    client: HTTPPort
  ): Promise<DeleteArticleOutput> {
    const validated = deleteArticleParams.parse(input);

    // Correct endpoint is v2/help_center/articles per API documentation
    const response = await client.request<DeleteArticleAPIResponse>(
      'delete',
      `v2/help_center/articles/${validated.articleId}`
    );

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to delete article: ${sanitized}`);
    }

    const resultData = {
      success: true,
      articleId: validated.articleId,
    };

    return deleteArticleOutput.parse({
      ...resultData,
      estimatedTokens: estimateTokens(resultData),
    });
  },
};
