// .claude/tools/linear/delete-label.ts
/**
 * delete_label - Linear GraphQL Wrapper
 *
 * Delete an issue label from Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~100 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Label UUID
 *
 * OUTPUT fields:
 * - success: boolean
 *
 * @example
 * ```typescript
 * await deleteLabel.execute({ id: 'label-uuid' });
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

const DELETE_LABEL_MUTATION = `
  mutation IssueLabelDelete($id: String!) {
    issueLabelDelete(id: $id) {
      success
    }
  }
`;

export const deleteLabelParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Label ID')
});

export type DeleteLabelInput = z.infer<typeof deleteLabelParams>;

export const deleteLabelOutput = z.object({
  success: z.boolean(),
  estimatedTokens: z.number()
});

export type DeleteLabelOutput = z.infer<typeof deleteLabelOutput>;

interface IssueLabelDeleteResponse {
  issueLabelDelete: {
    success: boolean;
  };
}

export const deleteLabel = {
  name: 'linear.delete_label',
  description: 'Delete a label from Linear',
  parameters: deleteLabelParams,

  async execute(
    input: DeleteLabelInput,
    testToken?: string
  ): Promise<DeleteLabelOutput> {
    const validated = deleteLabelParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<IssueLabelDeleteResponse>(
      client,
      DELETE_LABEL_MUTATION,
      { id: validated.id }
    );

    if (!response.issueLabelDelete?.success) {
      throw new Error('Failed to delete label');
    }

    const baseData = {
      success: response.issueLabelDelete.success
    };

    return deleteLabelOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 100,
    reduction: '99%'
  }
};
