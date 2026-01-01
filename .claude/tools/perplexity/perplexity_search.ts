/**
 * perplexity_search - Perplexity MCP Wrapper
 *
 * Performs web search using the Perplexity Search API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (search results text)
 * - vs Direct MCP: Unknown baseline
 * - Reduction: ~80% (estimated)
 *
 * Schema Discovery Results:
 *
 * INPUT (required):
 * - query: string - Search query
 *
 * INPUT (optional):
 * - max_results: number (1-20, default: 10)
 * - max_tokens_per_page: number (256-2048, default: 1024)
 * - country: string (ISO 3166-1 alpha-2)
 *
 * OUTPUT:
 * - Plain text response: "Found N search results..."
 * - Format: Text with search result summaries
 *
 * Edge cases discovered:
 * - Returns plain text, not JSON
 * - Can return 0 results for obscure queries
 * - Response format: "Found N search results about [topic]"
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

/**
 * Input validation schema
 * Maps to perplexity_search params
 *
 * Security: Uses individual validators for specific attack detection
 */
export const perplexitySearchParams = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Search query string'),

  max_results: z.number()
    .int()
    .min(1, 'max_results must be at least 1')
    .max(20, 'max_results cannot exceed 20')
    .optional()
    .describe('Maximum number of results to return (1-20, default: 10)'),

  max_tokens_per_page: z.number()
    .int()
    .min(256, 'max_tokens_per_page must be at least 256')
    .max(2048, 'max_tokens_per_page cannot exceed 2048')
    .optional()
    .describe('Maximum tokens to extract per webpage (default: 1024)'),

  country: z.string()
    .length(2, 'Country code must be 2 characters (ISO 3166-1 alpha-2)')
    .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters')
    .optional()
    .describe('ISO 3166-1 alpha-2 country code (e.g., US, GB)')
});

export type PerplexitySearchInput = z.infer<typeof perplexitySearchParams>;

/**
 * Output schema - plain text response
 */
export const perplexitySearchOutput = z.object({
  content: z.string().describe('Search results as plain text'),
  metadata: z.object({
    query: z.string(),
    resultCount: z.number().optional()
  }).optional()
});

export type PerplexitySearchOutput = z.infer<typeof perplexitySearchOutput>;

/**
 * Perform web search using Perplexity Search API
 *
 * @example
 * ```typescript
 * import { perplexitySearch } from './.claude/tools/perplexity';
 *
 * // Simple search
 * const results = await perplexitySearch.execute({ query: 'TypeScript best practices' });
 *
 * // Search with options
 * const filtered = await perplexitySearch.execute({
 *   query: 'AI news',
 *   max_results: 5,
 *   country: 'US'
 * });
 *
 * console.log(results.content);
 * ```
 */
export const perplexitySearch = {
  name: 'perplexity.search',
  description: 'Perform web search using Perplexity Search API with ranked results',
  parameters: perplexitySearchParams,

  async execute(input: PerplexitySearchInput): Promise<PerplexitySearchOutput> {
    // Validate input
    const validated = perplexitySearchParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'perplexity',
      'perplexity_search',
      validated
    );

    if (!rawData) {
      throw new Error('Empty response from Perplexity search');
    }

    // Handle plain text response (not JSON)
    const content = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);

    // Truncate for token efficiency (keep first 3000 chars)
    const truncated = content.length > 3000
      ? content.substring(0, 3000) + '\n... [truncated for token efficiency]'
      : content;

    // Extract result count from response text if possible
    const resultCountMatch = content.match(/Found (\d+) (?:search )?results?/i);
    const resultCount = resultCountMatch ? parseInt(resultCountMatch[1], 10) : undefined;

    // Validate and return output
    return perplexitySearchOutput.parse({
      content: truncated,
      metadata: {
        query: validated.query,
        resultCount
      }
    });
  },

  tokenEstimate: {
    withoutCustomTool: 5000, // Estimated baseline
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '90%'
  }
};
