// .claude/tools/linear/update-label.ts
/**
 * update_label - Linear GraphQL Wrapper
 *
 * Update an existing issue label in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Label UUID
 * - name: string (optional) - New label name
 * - color: string (optional) - New hex color code (e.g., #ff0000)
 * - description: string (optional) - New label description
 *
 * OUTPUT fields:
 * - success: boolean
 * - label: object with id, name, color
 *
 * @example
 * ```typescript
 * await updateLabel.execute({ id: 'label-uuid', color: '#00ff00' });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoControlCharsAllowWhitespace,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const UPDATE_LABEL_MUTATION = `
  mutation IssueLabelUpdate($id: String!, $input: IssueLabelUpdateInput!) {
    issueLabelUpdate(id: $id, input: $input) {
      success
      issueLabel {
        id
        name
        color
      }
    }
  }
`;

export const updateLabelParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Label ID'),
  name: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Label name'),
  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be hex color (e.g., #ff0000)')
    .optional()
    .describe('Hex color code'),
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('Label description')
});

export type UpdateLabelInput = z.infer<typeof updateLabelParams>;

export const updateLabelOutput = z.object({
  success: z.boolean(),
  label: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string()
  }),
  estimatedTokens: z.number()
});

export type UpdateLabelOutput = z.infer<typeof updateLabelOutput>;

interface IssueLabelUpdateResponse {
  issueLabelUpdate: {
    success: boolean;
    issueLabel?: {
      id: string;
      name: string;
      color: string;
    };
  };
}

export const updateLabel = {
  name: 'linear.update_label',
  description: 'Update a label in Linear',
  parameters: updateLabelParams,

  async execute(
    input: UpdateLabelInput,
    testToken?: string
  ): Promise<UpdateLabelOutput> {
    const validated = updateLabelParams.parse(input);
    const client = await createLinearClient(testToken);

    const mutationInput: Record<string, unknown> = {};
    if (validated.name) mutationInput.name = validated.name;
    if (validated.color) mutationInput.color = validated.color;
    if (validated.description) mutationInput.description = validated.description;

    const response = await executeGraphQL<IssueLabelUpdateResponse>(
      client,
      UPDATE_LABEL_MUTATION,
      { id: validated.id, input: mutationInput }
    );

    if (!response.issueLabelUpdate?.success || !response.issueLabelUpdate?.issueLabel) {
      throw new Error('Failed to update label');
    }

    const baseData = {
      success: response.issueLabelUpdate.success,
      label: {
        id: response.issueLabelUpdate.issueLabel.id,
        name: response.issueLabelUpdate.issueLabel.name,
        color: response.issueLabelUpdate.issueLabel.color
      }
    };

    return updateLabelOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '99%'
  }
};
