/**
 * delete_reaction - Linear GraphQL Wrapper
 *
 * Delete an emoji reaction from a comment in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (minimal response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Reaction UUID to delete
 *
 * OUTPUT:
 * - success: boolean
 *
 * Edge cases discovered:
 * - Deleting non-existent reaction returns success: false
 * - Only the user who created the reaction can delete it
 *
 * @example
 * ```typescript
 * const result = await deleteReaction.execute({
 *   id: 'reaction-uuid'
 * });
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

const DELETE_REACTION_MUTATION = `
  mutation ReactionDelete($id: String!) {
    reactionDelete(id: $id) {
      success
    }
  }
`;

export const deleteReactionParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Reaction ID to delete')
});

export type DeleteReactionInput = z.infer<typeof deleteReactionParams>;

export const deleteReactionOutput = z.object({
  success: z.boolean(),
  estimatedTokens: z.number()
});

export type DeleteReactionOutput = z.infer<typeof deleteReactionOutput>;

interface ReactionDeleteResponse {
  reactionDelete: {
    success: boolean;
  };
}

export const deleteReaction = {
  name: 'linear.delete_reaction',
  description: 'Delete an emoji reaction from a comment in Linear',
  parameters: deleteReactionParams,

  async execute(
    input: DeleteReactionInput,
    testToken?: string
  ): Promise<DeleteReactionOutput> {
    const validated = deleteReactionParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<ReactionDeleteResponse>(
      client,
      DELETE_REACTION_MUTATION,
      { id: validated.id }
    );

    if (!response.reactionDelete?.success) {
      throw new Error('Failed to delete reaction');
    }

    const baseData = {
      success: response.reactionDelete.success
    };

    return deleteReactionOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 50,
    reduction: '99%'
  }
};
