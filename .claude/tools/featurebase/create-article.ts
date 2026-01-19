/**
 * create_article - FeatureBase REST Wrapper
 *
 * Create a new article in the FeatureBase knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~350 tokens (single article)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 86%
 *
 * Schema Discovery Results:
 * - API uses "content" for article body
 * - API uses "body" in response (not "content")
 * - API uses "category" string (not categoryId)
 * - publishedAt is required on creation
 *
 * Required fields:
 * - title: string (max 255 chars)
 * - content: string (markdown supported)
 * - category: string
 * - publishedAt: string (ISO 8601)
 *
 * Optional fields:
 * - slug: string
 * - tags: string[]
 *
 * Edge cases discovered:
 * - API returns "body" but accepts "content" for POST
 * - Category must exist or request fails
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * Input schema for create-article
 */
export const createArticleParams = z.object({
  title: z.string()
    .min(1, 'title is required')
    .max(255, 'title cannot exceed 255 characters')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Article title'),

  content: z.string()
    .min(1, 'content is required')
    .describe('Article content (markdown supported)'),

  category: z.string()
    .min(1, 'category is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Article category'),

  slug: z.string()
    .optional()
    .refine(val => !val || validateNoControlChars(val), 'Control characters not allowed')
    .refine(val => !val || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine(val => !val || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Optional URL slug'),

  publishedAt: z.string()
    .min(1, 'publishedAt is required')
    .describe('Publication date (ISO 8601 format)'),

  tags: z.array(z.string())
    .optional()
    .describe('Optional tags for categorization'),
});

export type CreateArticleInput = z.infer<typeof createArticleParams>;

/**
 * Output schema for create-article
 */
export const createArticleOutput = z.object({
  article: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string(),
    slug: z.string().optional(),
    publishedAt: z.string(),
    updatedAt: z.string(),
    tags: z.array(z.string()).optional(),
  }),
  estimatedTokens: z.number(),
});

export type CreateArticleOutput = z.infer<typeof createArticleOutput>;

/**
 * FeatureBase API response schema for create article endpoint
 */
interface CreateArticleAPIResponse {
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

/**
 * Create article tool
 */
export const createArticle = {
  name: 'featurebase.create_article',
  description: 'Create a new article',
  parameters: createArticleParams,

  async execute(
    input: CreateArticleInput,
    client: HTTPPort
  ): Promise<CreateArticleOutput> {
    // Validate input
    const validated = createArticleParams.parse(input);

    // Make request - correct endpoint is v2/help_center/articles per API documentation
    const response = await client.request<CreateArticleAPIResponse>('post', 'v2/help_center/articles', {
      json: {
        title: validated.title,
        content: validated.content, // API uses 'content' for POST
        category: validated.category, // Required by API
        ...(validated.slug && { slug: validated.slug }),
        ...(validated.publishedAt && { publishedAt: validated.publishedAt }),
        ...(validated.tags && { tags: validated.tags }),
      },
    });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to create article: ${sanitized}`);
    }

    const article = response.data;

    const articleData = {
      id: article.id,
      title: article.title,
      content: article.body || article.content || '', // API uses 'body' not 'content'
      category: article.category || validated.category || '', // Prefer API category if available
      slug: article.slug,
      publishedAt: article.publishedAt || article.createdAt || new Date().toISOString(),
      updatedAt: article.updatedAt || new Date().toISOString(),
      tags: (article as any).tags || validated.tags,
    };

    return createArticleOutput.parse({
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
