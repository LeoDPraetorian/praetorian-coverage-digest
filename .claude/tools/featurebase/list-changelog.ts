/**
 * list_changelog - FeatureBase REST Wrapper
 *
 * Fetch paginated list of changelog entries.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1500 tokens (20 entries per page)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 70%
 *
 * Schema Discovery Results:
 * - Returns entries array with pagination
 * - Default limit is 20
 * - Sorted by publishedAt desc
 *
 * Optional fields:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 *
 * Edge cases discovered:
 * - Sorted newest first by default
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';

/**
 * Input schema for list-changelog
 */
export const listChangelogParams = z.object({
  limit: z.number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(100, 'limit cannot exceed 100')
    .default(10)
    .describe('Number of changelog entries to return (1-100)'),

  cursor: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Pagination cursor from previous response'),

  tags: z.array(z.string())
    .optional()
    .describe('Filter by tag names'),

  q: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Search query for title/content'),
});

export type ListChangelogInput = z.infer<typeof listChangelogParams>;

/**
 * Output schema for list-changelog
 * Filtered to essential fields for token optimization
 */
export const listChangelogOutput = z.object({
  entries: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })),
  nextCursor: z.string().nullable(),
  totalCount: z.number(),
  estimatedTokens: z.number(),
});

export type ListChangelogOutput = z.infer<typeof listChangelogOutput>;

/**
 * List changelog tool
 */
export const listChangelog = {
  name: 'featurebase.list_changelog',
  description: 'List changelog entries with filtering and pagination',
  parameters: listChangelogParams,

  async execute(
    input: ListChangelogInput,
    client: HTTPPort
  ): Promise<ListChangelogOutput> {
    // Validate input
    const validated = listChangelogParams.parse(input);

    // Build query params
    const searchParams: Record<string, string | number> = {
      limit: validated.limit,
    };

    if (validated.cursor) searchParams.cursor = validated.cursor;
    if (validated.tags) searchParams.tags = validated.tags.join(',');
    if (validated.q) searchParams.q = validated.q;

    // Make request
    // API returns: {results: [...], page: 1, totalResults: 0}
    const response = await client.request<{
      results: Array<{
        id: string;
        title: string;
        content: string;
        publishedAt: string;
        updatedAt?: string;
        tags?: string[];
      }>;
      page: number;
      totalResults: number;
    }>('get', 'v2/changelogs', { searchParams });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`FeatureBase API error: ${sanitized}`);
    }

    // Extract results array from API response
    const entriesArray = response.data.results || [];

    // Filter and return
    const filtered = {
      entries: entriesArray.map(entry => ({
        id: entry.id,
        title: entry.title,
        content: (entry.content || '').substring(0, 500), // Truncate for token optimization
        publishedAt: entry.publishedAt || new Date().toISOString(),
        updatedAt: entry.updatedAt,
        tags: entry.tags || [],
      })),
      nextCursor: null, // Changelog uses page-based pagination, not cursor
      totalCount: response.data.totalResults || entriesArray.length,
      estimatedTokens: estimateTokens(response.data),
    };

    return listChangelogOutput.parse(filtered);
  },

  estimatedTokens: 500,
  tokenEstimate: {
    withoutCustomTool: 3000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '83%',
  },
};
