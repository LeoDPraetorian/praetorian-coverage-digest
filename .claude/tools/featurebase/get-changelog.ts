/**
 * get_changelog - FeatureBase REST Wrapper
 *
 * Fetch a single changelog entry by ID.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (single entry)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 84%
 *
 * Schema Discovery Results:
 * - Returns full changelog entry with metadata
 * - publishedAt is ISO 8601
 * - tags array is optional
 *
 * Required fields:
 * - changelogId: string
 *
 * Edge cases discovered:
 * - Returns 404 if entry doesn't exist
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * Input schema for get-changelog
 */
export const getChangelogParams = z.object({
  changelogId: z.string()
    .min(1, 'changelogId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Changelog ID to retrieve'),
});

export type GetChangelogInput = z.infer<typeof getChangelogParams>;

/**
 * Output schema for get-changelog
 * Returns single changelog entry with essential fields
 */
export const getChangelogOutput = z.object({
  entry: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    publishedAt: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  estimatedTokens: z.number(),
});

export type GetChangelogOutput = z.infer<typeof getChangelogOutput>;

/**
 * API response interface for get changelog
 */
interface GetChangelogAPIResponse {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}

/**
 * Get changelog tool
 */
export const getChangelog = {
  name: 'featurebase.get_changelog',
  description: 'Get a single changelog entry by ID',
  parameters: getChangelogParams,

  async execute(
    input: GetChangelogInput,
    client: HTTPPort
  ): Promise<GetChangelogOutput> {
    // Validate input
    const validated = getChangelogParams.parse(input);

    // Make request
    const response = await client.request<GetChangelogAPIResponse>(
      'get',
      `v2/changelogs/${validated.changelogId}`
    );

    if (!response.ok) {
      const message = response.error.status === 404
        ? `Changelog not found: ${validated.changelogId}`
        : `Failed to get changelog: ${sanitizeErrorMessage(response.error.message)}`;
      throw new Error(message);
    }

    const entry = response.data;

    const entryData = {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      publishedAt: entry.publishedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      tags: entry.tags || [],
    };

    // Return validated output
    return getChangelogOutput.parse({
      entry: entryData,
      estimatedTokens: estimateTokens(entryData),
    });
  },


  estimatedTokens: 200,
  tokenEstimate: {
    withoutCustomTool: 800,
    withCustomTool: 0,
    whenUsed: 200,
    reduction: '75%',
  },
};
