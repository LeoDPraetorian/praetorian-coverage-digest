// .claude/tools/linear/get-label.ts
/**
 * get_label - Linear GraphQL Wrapper
 *
 * Get a single label by ID from Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Label UUID
 *
 * OUTPUT fields:
 * - id: string (required)
 * - name: string (required)
 * - description: string | null
 * - color: string (hex color)
 * - isGroup: boolean
 * - parentId: string | null
 *
 * @example
 * ```typescript
 * await getLabel.execute({ id: 'label-uuid' });
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

const GET_LABEL_QUERY = `
  query IssueLabel($id: String!) {
    issueLabel(id: $id) {
      id
      name
      description
      color
      isGroup
      parent { id name }
      team { id name }
    }
  }
`;

export const getLabelParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Label ID')
});

export type GetLabelInput = z.infer<typeof getLabelParams>;

export const getLabelOutput = z.object({
  label: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    color: z.string(),
    isGroup: z.boolean().optional(),
    parentId: z.string().optional(),
    parentName: z.string().optional(),
    teamId: z.string().optional(),
    teamName: z.string().optional()
  }),
  estimatedTokens: z.number()
});

export type GetLabelOutput = z.infer<typeof getLabelOutput>;

interface IssueLabelResponse {
  issueLabel: {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    isGroup?: boolean;
    parent?: { id: string; name: string } | null;
    team?: { id: string; name: string } | null;
  };
}

export const getLabel = {
  name: 'linear.get_label',
  description: 'Get a label by ID from Linear',
  parameters: getLabelParams,

  async execute(
    input: GetLabelInput,
    testToken?: string
  ): Promise<GetLabelOutput> {
    const validated = getLabelParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<IssueLabelResponse>(
      client,
      GET_LABEL_QUERY,
      { id: validated.id }
    );

    if (!response.issueLabel) {
      throw new Error(`Label not found: ${validated.id}`);
    }

    const label = response.issueLabel;
    const baseData = {
      label: {
        id: label.id,
        name: label.name,
        description: label.description || undefined,
        color: label.color,
        isGroup: label.isGroup,
        parentId: label.parent?.id,
        parentName: label.parent?.name,
        teamId: label.team?.id,
        teamName: label.team?.name
      }
    };

    return getLabelOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 200,
    reduction: '99%'
  }
};
