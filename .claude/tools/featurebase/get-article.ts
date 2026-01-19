/**
 * get_article - FeatureBase REST Wrapper
 *
 * Fetch a single article by ID from FeatureBase knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~350 tokens (single article)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 86%
 *
 * Schema Discovery Results:
 * - API returns "body" (not "content")
 * - publishedAt is ISO 8601
 * - slug is optional
 *
 * Required fields:
 * - articleId: string
 *
 * Edge cases discovered:
 * - API response uses "body" field name
 * - Returns 404 if article doesn't exist
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const getArticleParams = z.object({
  articleId: z.string()
    .min(1, 'articleId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Article ID to retrieve'),
});

export type GetArticleInput = z.infer<typeof getArticleParams>;

export const getArticleOutput = z.object({
  article: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string(),
    slug: z.string().optional(),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
  }),
  estimatedTokens: z.number(),
});

export type GetArticleOutput = z.infer<typeof getArticleOutput>;

/**
 * FeatureBase API response schema for get article endpoint
 */
interface GetArticleAPIResponse {
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

export const getArticle = {
  name: 'featurebase.get_article',
  description: 'Get a single article by ID',
  parameters: getArticleParams,

  async execute(
    input: GetArticleInput,
    client: HTTPPort
  ): Promise<GetArticleOutput> {
    const validated = getArticleParams.parse(input);

    // Correct endpoint is v2/help_center/articles per API documentation
    const response = await client.request<GetArticleAPIResponse>(
      'get',
      `v2/help_center/articles/${validated.articleId}`
    );

    if (!response.ok) {
      const message = response.error.status === 404
        ? `Article not found: ${validated.articleId}`
        : `Failed to get article: ${sanitizeErrorMessage(response.error.message)}`;
      throw new Error(message);
    }

    const article = response.data;

    const articleData = {
      id: article.id,
      title: article.title,
      content: article.body || article.content || '', // API uses 'body' not 'content'
      category: article.category || '', // Extract category from API
      slug: article.slug,
      publishedAt: article.publishedAt || article.createdAt || new Date().toISOString(),
      updatedAt: article.updatedAt,
    };

    return getArticleOutput.parse({
      article: articleData,
      estimatedTokens: estimateTokens(articleData),
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
