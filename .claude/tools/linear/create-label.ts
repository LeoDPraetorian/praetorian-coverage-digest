// .claude/tools/linear/create-label.ts
/**
 * create_label - Linear GraphQL Wrapper
 *
 * Create a new issue label in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - name: string (required) - Label name
 * - color: string (optional) - Hex color code (e.g., #ff0000)
 * - description: string (optional) - Label description
 * - teamId: string (optional) - Team to scope the label to
 * - parentId: string (optional) - Parent label for grouping
 *
 * OUTPUT fields:
 * - success: boolean
 * - label: object with id, name, color
 *
 * @example
 * ```typescript
 * await createLabel.execute({ name: 'Bug', color: '#ff0000' });
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

const CREATE_LABEL_MUTATION = `
  mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
    issueLabelCreate(input: $input) {
      success
      issueLabel {
        id
        name
        color
      }
    }
  }
`;

export const createLabelParams = z.object({
  name: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Label name'),
  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be hex color (e.g., #ff0000)')
    .optional()
    .describe('Hex color code'),
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('Label description'),
  teamId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Team ID to scope label'),
  parentId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Parent label ID for grouping')
});

export type CreateLabelInput = z.infer<typeof createLabelParams>;

export const createLabelOutput = z.object({
  success: z.boolean(),
  label: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateLabelOutput = z.infer<typeof createLabelOutput>;

interface IssueLabelCreateResponse {
  issueLabelCreate: {
    success: boolean;
    issueLabel?: {
      id: string;
      name: string;
      color: string;
    };
  };
}

export const createLabel = {
  name: 'linear.create_label',
  description: 'Create a new label in Linear',
  parameters: createLabelParams,

  async execute(
    input: CreateLabelInput,
    testToken?: string
  ): Promise<CreateLabelOutput> {
    const validated = createLabelParams.parse(input);
    const client = await createLinearClient(testToken);

    const mutationInput: Record<string, unknown> = {
      name: validated.name
    };
    if (validated.color) mutationInput.color = validated.color;
    if (validated.description) mutationInput.description = validated.description;
    if (validated.teamId) mutationInput.teamId = validated.teamId;
    if (validated.parentId) mutationInput.parentId = validated.parentId;

    const response = await executeGraphQL<IssueLabelCreateResponse>(
      client,
      CREATE_LABEL_MUTATION,
      { input: mutationInput }
    );

    if (!response.issueLabelCreate?.success || !response.issueLabelCreate?.issueLabel) {
      throw new Error('Failed to create label');
    }

    const baseData = {
      success: response.issueLabelCreate.success,
      label: {
        id: response.issueLabelCreate.issueLabel.id,
        name: response.issueLabelCreate.issueLabel.name,
        color: response.issueLabelCreate.issueLabel.color
      }
    };

    return createLabelOutput.parse({
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
