/**
 * delete_changelog - FeatureBase REST Wrapper
 *
 * Delete a changelog entry from FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (success response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 95%
 *
 * Schema Discovery Results:
 * - Returns success boolean
 * - Permanent deletion
 *
 * Required fields:
 * - changelogId: string
 *
 * Edge cases discovered:
 * - Returns 404 if entry doesn't exist
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const deleteChangelogParams = z.object({
  changelogId: z.string()
    .min(1, 'changelogId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Changelog ID to delete'),
});

export type DeleteChangelogInput = z.infer<typeof deleteChangelogParams>;

export const deleteChangelogOutput = z.object({
  success: z.boolean(),
  changelogId: z.string(),
  estimatedTokens: z.number(),
});

export type DeleteChangelogOutput = z.infer<typeof deleteChangelogOutput>;

/**
 * FeatureBase API response schema for delete changelog endpoint
 */
interface DeleteChangelogAPIResponse {
  success?: boolean;
}

export const deleteChangelog = {
  name: 'featurebase.delete_changelog',
  description: 'Delete a changelog entry',
  parameters: deleteChangelogParams,

  async execute(
    input: DeleteChangelogInput,
    client: HTTPPort
  ): Promise<DeleteChangelogOutput> {
    const validated = deleteChangelogParams.parse(input);

    const response = await client.request<DeleteChangelogAPIResponse>(
      'delete',
      `v2/changelogs/${validated.changelogId}`
    );

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to delete changelog: ${sanitized}`);
    }

    const resultData = {
      success: true,
      changelogId: validated.changelogId,
    };

    return deleteChangelogOutput.parse({
      ...resultData,
      estimatedTokens: estimateTokens(resultData),
    });
  },
};
