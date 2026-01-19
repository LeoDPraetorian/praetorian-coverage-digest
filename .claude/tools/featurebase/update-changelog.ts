/**
 * update_changelog - FeatureBase REST Wrapper
 *
 * Update an existing changelog entry.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (updated entry)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 84%
 *
 * Schema Discovery Results:
 * - Partial updates supported
 * - All fields optional except changelogId
 * - Returns updated entry
 *
 * Required fields:
 * - changelogId: string
 *
 * Optional fields:
 * - title: string
 * - content: string
 * - publishedAt: string
 * - tags: string[]
 *
 * Edge cases discovered:
 * - Partial updates allowed
 * - Returns 404 if entry doesn't exist
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * Input schema for update-changelog
 */
export const updateChangelogParams = z.object({
  changelogId: z.string()
    .min(1, 'changelogId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Changelog ID to update'),

  title: z.string()
    .max(255, 'title cannot exceed 255 characters')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Changelog title'),

  content: z.string()
    .optional()
    .describe('Changelog content (markdown supported)'),

  publishedAt: z.string()
    .optional()
    .describe('Publication date (ISO 8601 format)'),

  tags: z.array(z.string())
    .optional()
    .describe('Tags'),
});

export type UpdateChangelogInput = z.infer<typeof updateChangelogParams>;

/**
 * Output schema for update-changelog
 */
export const updateChangelogOutput = z.object({
  entry: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    publishedAt: z.string(),
    updatedAt: z.string(),
  }),
  estimatedTokens: z.number(),
});

export type UpdateChangelogOutput = z.infer<typeof updateChangelogOutput>;

/**
 * FeatureBase API response schema for update changelog endpoint
 */
interface UpdateChangelogAPIResponse {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  updatedAt: string;
}

/**
 * Partial update data for changelog
 */
interface UpdateChangelogData {
  title?: string;
  content?: string;
  publishedAt?: string;
  tags?: string[];
}

/**
 * Update changelog tool
 */
export const updateChangelog = {
  name: 'featurebase.update_changelog',
  description: 'Update an existing changelog entry',
  parameters: updateChangelogParams,

  async execute(
    input: UpdateChangelogInput,
    client: HTTPPort
  ): Promise<UpdateChangelogOutput> {
    // Validate input
    const validated = updateChangelogParams.parse(input);

    // Build update data
    const updateData: UpdateChangelogData = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.content) updateData.content = validated.content;
    if (validated.publishedAt) updateData.publishedAt = validated.publishedAt;
    if (validated.tags) updateData.tags = validated.tags;

    // Make request
    const response = await client.request<UpdateChangelogAPIResponse>(
      'put',
      `v2/changelogs/${validated.changelogId}`,
      { json: updateData }
    );

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to update changelog: ${sanitized}`);
    }

    const entry = response.data;

    const entryData = {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      publishedAt: entry.publishedAt,
      updatedAt: entry.updatedAt,
    };

    return updateChangelogOutput.parse({
      entry: entryData,
      estimatedTokens: estimateTokens(entryData),
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
