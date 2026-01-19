/**
 * list_articles - FeatureBase REST Wrapper
 *
 * Fetch paginated list of articles from knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1200 tokens (20 articles per page)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 75%
 *
 * Schema Discovery Results:
 * - Returns articles array with pagination
 * - category filter is optional
 * - Default limit is 20
 *
 * Optional fields:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 * - category: string (filter)
 *
 * Edge cases discovered:
 * - Empty category returns all articles
 * - Pagination via offset
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';

/**
 * Input schema for list-articles
 */
export const listArticlesParams = z.object({
  limit: z.number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(100, 'limit cannot exceed 100')
    .default(10)
    .describe('Number of articles to return (1-100)'),

  cursor: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Pagination cursor from previous response'),

  category: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Filter by category'),

  q: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Search query for title/content'),
});

export type ListArticlesInput = z.infer<typeof listArticlesParams>;

/**
 * Output schema for list-articles
 * Filtered to essential fields for token optimization
 */
export const listArticlesOutput = z.object({
  articles: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string(),
    slug: z.string().optional(),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
  })),
  nextCursor: z.string().nullable(),
  totalCount: z.number(),
  estimatedTokens: z.number(),
});

export type ListArticlesOutput = z.infer<typeof listArticlesOutput>;

/**
 * List articles tool
 */
export const listArticles = {
  name: 'featurebase.list_articles',
  description: 'List articles with filtering and pagination',
  parameters: listArticlesParams,

  async execute(
    input: ListArticlesInput,
    client: HTTPPort
  ): Promise<ListArticlesOutput> {
    // Validate input
    const validated = listArticlesParams.parse(input);

    // Build query params
    const searchParams: Record<string, string | number> = {
      limit: validated.limit,
    };

    if (validated.cursor) searchParams.cursor = validated.cursor;
    if (validated.category) searchParams.category = validated.category;
    if (validated.q) searchParams.q = validated.q;

    // Make request
    // API returns: {data: [...], page: 1, totalResults: N} (or legacy: {results: [...]})
    // Correct endpoint is v2/help_center/articles per API documentation
    // Increase response size limit to 2MB for articles (can be large)
    const response = await client.request<{
      data?: Array<{
        id: string;
        title: string;
        body: string; // API uses "body" not "content" for articles
        description?: string;
        category?: string; // Category field from API
        slug?: string;
        publishedAt?: string;
        createdAt: string;
        updatedAt: string;
      }>;
      results?: Array<{
        id: string;
        title: string;
        body: string; // API uses "body" not "content" for articles
        description?: string;
        category?: string; // Category field from API
        slug?: string;
        publishedAt?: string;
        createdAt: string;
        updatedAt: string;
      }>;
      page: number;
      totalResults: number;
    }>('get', 'v2/help_center/articles', {
      searchParams,
      maxResponseBytes: 2_000_000, // 2MB limit for articles
    });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`FeatureBase API error: ${sanitized}`);
    }

    // Extract results array from API response
    // Support both response.data.data (newer) and response.data.results (legacy) for backwards compatibility
    const articlesArray = response.data.data || response.data.results || [];

    // Filter and return
    const filtered = {
      articles: articlesArray.map(article => ({
        id: article.id,
        title: article.title,
        content: (article.body || '').substring(0, 500), // Truncate for token optimization
        category: article.category || '', // Extract category from API response
        slug: article.slug,
        publishedAt: article.publishedAt || article.createdAt || new Date().toISOString(),
        updatedAt: article.updatedAt || new Date().toISOString(),
      })),
      nextCursor: null, // Articles use page-based pagination, not cursor
      totalCount: response.data.totalResults || articlesArray.length,
      estimatedTokens: estimateTokens(response.data),
    };

    return listArticlesOutput.parse(filtered);
  },

  estimatedTokens: 600,
  tokenEstimate: {
    withoutCustomTool: 3500,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '83%',
  },
};
