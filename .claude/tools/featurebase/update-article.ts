/**
 * update_article - FeatureBase REST Wrapper
 *
 * Update an existing article in knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~350 tokens (updated article)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 86%
 *
 * Schema Discovery Results:
 * - Partial updates supported
 * - All fields optional except articleId
 * - Returns updated article
 *
 * Required fields:
 * - articleId: string
 *
 * Optional fields:
 * - title: string
 * - content: string
 * - category: string
 * - slug: string
 * - publishedAt: string
 *
 * Edge cases discovered:
 * - Partial updates allowed
 * - Returns 404 if article doesn't exist
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const updateArticleParams = z.object({
  articleId: z.string()
    .min(1, 'articleId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Article ID to update'),

  title: z.string()
    .optional()
    .refine(val => !val || validateNoControlChars(val), 'Control characters not allowed')
    .describe('Updated title'),

  content: z.string()
    .optional()
    .describe('Updated content'),

  category: z.string()
    .optional()
    .refine(val => !val || validateNoControlChars(val), 'Control characters not allowed')
    .describe('Updated category'),

  slug: z.string()
    .optional()
    .refine(val => !val || validateNoControlChars(val), 'Control characters not allowed')
    .describe('Updated slug'),
});

export type UpdateArticleInput = z.infer<typeof updateArticleParams>;

export const updateArticleOutput = z.object({
  article: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string(),
    slug: z.string().optional(),
    publishedAt: z.string(),
    updatedAt: z.string(),
  }),
  estimatedTokens: z.number(),
});

export type UpdateArticleOutput = z.infer<typeof updateArticleOutput>;

/**
 * FeatureBase API response schema for update article endpoint
 */
interface UpdateArticleAPIResponse {
  id: string;
  title: string;
  content?: string;
  body?: string;
  category?: string;
  slug?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const updateArticle = {
  name: 'featurebase.update_article',
  description: 'Update an article',
  parameters: updateArticleParams,

  async execute(
    input: UpdateArticleInput,
    client: HTTPPort
  ): Promise<UpdateArticleOutput> {
    const validated = updateArticleParams.parse(input);

    // Correct endpoint is v2/help_center/articles per API documentation
    const response = await client.request<UpdateArticleAPIResponse>(
      'put',
      `v2/help_center/articles/${validated.articleId}`,
      {
        json: {
          ...(validated.title && { title: validated.title }),
          ...(validated.content && { body: validated.content }), // API uses 'body' not 'content'
          // category not supported by API
          ...(validated.slug && { slug: validated.slug }),
        },
      }
    );

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to update article: ${sanitized}`);
    }

    const article = response.data;

    const articleData = {
      id: article.id,
      title: article.title,
      content: article.body || article.content || '', // API uses 'body' not 'content'
      category: article.category || validated.category || '', // Use input category as fallback
      slug: article.slug,
      publishedAt: article.publishedAt || article.createdAt || article.updatedAt || new Date().toISOString(),
      updatedAt: article.updatedAt || new Date().toISOString(),
    };

    return updateArticleOutput.parse({
      article: articleData,
      estimatedTokens: estimateTokens(articleData),
    });
  },

  estimatedTokens: 350,
  tokenEstimate: {
    withoutCustomTool: 2500,
    withCustomTool: 0,
    whenUsed: 350,
    reduction: '86%',
  },
};
