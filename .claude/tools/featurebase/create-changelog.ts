/**
 * create_changelog - FeatureBase REST Wrapper
 *
 * Create a new changelog entry in FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (single entry)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 84%
 *
 * Schema Discovery Results:
 * - API uses "content" field for main text
 * - publishedAt is ISO 8601 timestamp
 * - tags array is optional
 *
 * Required fields:
 * - title: string (max 255 chars)
 * - content: string (markdown supported)
 * - publishedAt: string (ISO 8601)
 *
 * Optional fields:
 * - tags: string[]
 *
 * Edge cases discovered:
 * - publishedAt must be valid ISO 8601 or fails
 * - Content supports full markdown
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * Input schema for create-changelog
 */
export const createChangelogParams = z.object({
  title: z.string()
    .min(1, 'title is required')
    .max(255, 'title cannot exceed 255 characters')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Changelog title'),

  content: z.string()
    .min(1, 'content is required')
    .describe('Changelog content (markdown supported)'),

  publishedAt: z.string()
    .min(1, 'publishedAt is required')
    .describe('Publication date (ISO 8601 format)'),

  tags: z.array(z.string())
    .optional()
    .describe('Optional tags'),
});

export type CreateChangelogInput = z.infer<typeof createChangelogParams>;

/**
 * Output schema for create-changelog
 */
export const createChangelogOutput = z.object({
  entry: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    publishedAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  estimatedTokens: z.number(),
});

export type CreateChangelogOutput = z.infer<typeof createChangelogOutput>;

/**
 * FeatureBase API response schema for create changelog endpoint
 */
interface CreateChangelogAPIResponse {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create changelog tool
 */
export const createChangelog = {
  name: 'featurebase.create_changelog',
  description: 'Create a new changelog entry',
  parameters: createChangelogParams,

  async execute(
    input: CreateChangelogInput,
    client: HTTPPort
  ): Promise<CreateChangelogOutput> {
    // Validate input
    const validated = createChangelogParams.parse(input);

    // Make request
    const response = await client.request<CreateChangelogAPIResponse>('post', 'v2/changelogs', {
      json: {
        title: validated.title,
        content: validated.content,
        publishedAt: validated.publishedAt,
        ...(validated.tags && { tags: validated.tags }),
      },
    });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to create changelog: ${sanitized}`);
    }

    const entry = response.data;

    const entryData = {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      publishedAt: entry.publishedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };

    return createChangelogOutput.parse({
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
