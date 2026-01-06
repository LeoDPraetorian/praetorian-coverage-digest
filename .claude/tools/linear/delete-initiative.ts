/**
 * delete_initiative - Linear GraphQL Wrapper
 *
 * Delete an initiative in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (deletion confirmation)
 * - vs MCP: Consistent behavior, no server dependency
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - id: string (required) - Initiative UUID or name
 *
 * OUTPUT:
 * - success: boolean - Whether deletion succeeded
 * - estimatedTokens: number
 *
 * @example
 * ```typescript
 * // Delete by ID
 * await deleteInitiative.execute({ id: 'abc-123' });
 *
 * // Delete by name
 * await deleteInitiative.execute({ id: 'Q2 2025 Roadmap' });
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

/**
 * GraphQL mutation for deleting an initiative
 */
const DELETE_INITIATIVE_MUTATION = `
  mutation InitiativeDelete($id: String!) {
    initiativeDelete(id: $id) {
      success
    }
  }
`;

/**
 * Input validation schema
 */
export const deleteInitiativeParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Initiative ID or name')
});

export type DeleteInitiativeInput = z.infer<typeof deleteInitiativeParams>;

/**
 * Output schema
 */
export const deleteInitiativeOutput = z.object({
  success: z.boolean(),
  estimatedTokens: z.number()
});

export type DeleteInitiativeOutput = z.infer<typeof deleteInitiativeOutput>;

/**
 * GraphQL response type
 */
interface InitiativeDeleteResponse {
  initiativeDelete: {
    success: boolean;
  };
}

/**
 * Delete a Linear initiative using GraphQL API
 */
export const deleteInitiative = {
  name: 'linear.delete_initiative',
  description: 'Delete an initiative in Linear',
  parameters: deleteInitiativeParams,

  async execute(
    input: DeleteInitiativeInput,
    testToken?: string
  ): Promise<DeleteInitiativeOutput> {
    // Validate input
    const validated = deleteInitiativeParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<InitiativeDeleteResponse>(
      client,
      DELETE_INITIATIVE_MUTATION,
      { id: validated.id }
    );

    // Check for success
    if (!response.initiativeDelete.success) {
      throw new Error('Failed to delete initiative');
    }

    // Filter to essential fields
    const baseData = {
      success: true
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return deleteInitiativeOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '99%'
  }
};
