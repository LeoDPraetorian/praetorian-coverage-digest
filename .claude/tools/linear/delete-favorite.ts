/**
 * delete_favorite - Linear GraphQL Wrapper
 *
 * Delete a favorite (unstar item) in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~25 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Favorite UUID to delete
 *
 * OUTPUT (after filtering):
 * - success: boolean
 *
 * Edge cases discovered:
 * - Deleting non-existent favorite returns success without error
 * - Cannot restore deleted favorites (no undelete operation)
 *
 * @example
 * ```typescript
 * await deleteFavorite.execute({ id: 'favorite-uuid' });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const DELETE_FAVORITE_MUTATION = `
  mutation FavoriteDelete($id: String!) {
    favoriteDelete(id: $id) {
      success
    }
  }
`;

export const deleteFavoriteParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Favorite UUID to delete')
});

export type DeleteFavoriteInput = z.infer<typeof deleteFavoriteParams>;

export const deleteFavoriteOutput = z.object({
  success: z.boolean(),
  estimatedTokens: z.number()
});

export type DeleteFavoriteOutput = z.infer<typeof deleteFavoriteOutput>;

interface FavoriteDeleteResponse {
  favoriteDelete: {
    success: boolean;
  };
}

export const deleteFavorite = {
  name: 'linear.delete_favorite',
  description: 'Delete a favorite (unstar) in Linear',
  parameters: deleteFavoriteParams,

  async execute(
    input: DeleteFavoriteInput,
    testToken?: string
  ): Promise<DeleteFavoriteOutput> {
    const validated = deleteFavoriteParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<FavoriteDeleteResponse>(
      client,
      DELETE_FAVORITE_MUTATION,
      { id: validated.id }
    );

    if (!response.favoriteDelete?.success) {
      throw new Error('Failed to delete favorite');
    }

    const baseData = {
      success: response.favoriteDelete.success
    };

    return deleteFavoriteOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 25,
    reduction: '99%'
  }
};
