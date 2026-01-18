/**
 * update_workflow_state - Linear GraphQL Wrapper
 *
 * Update an existing workflow state in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~350 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Workflow state UUID to update
 * - name: string (optional) - Updated state name
 * - color: string (optional) - Updated hex color code
 * - position: number (optional) - Updated sort position
 * - description: string (optional) - Updated state description
 *
 * OUTPUT:
 * - success: boolean
 * - workflowState: object with id, name, type, color
 *
 * @example
 * ```typescript
 * const state = await updateWorkflowState.execute({
 *   id: 'state-uuid',
 *   name: 'Under Review',
 *   color: '#27ae60'
 * });
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

const UPDATE_WORKFLOW_STATE_MUTATION = `
  mutation WorkflowStateUpdate($id: String!, $input: WorkflowStateUpdateInput!) {
    workflowStateUpdate(id: $id, input: $input) {
      success
      workflowState {
        id
        name
        type
        color
      }
    }
  }
`;

export const updateWorkflowStateParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Workflow state ID'),
  name: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Updated state name'),
  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be hex color (e.g., #f2c94c)')
    .optional()
    .describe('Updated hex color code'),
  position: z.number()
    .min(0)
    .optional()
    .describe('Updated sort position'),
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('Updated state description')
});

export type UpdateWorkflowStateInput = z.infer<typeof updateWorkflowStateParams>;

export const updateWorkflowStateOutput = z.object({
  success: z.boolean(),
  workflowState: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['backlog', 'unstarted', 'started', 'completed', 'canceled']),
    color: z.string()
  }),
  estimatedTokens: z.number()
});

export type UpdateWorkflowStateOutput = z.infer<typeof updateWorkflowStateOutput>;

interface WorkflowStateUpdateResponse {
  workflowStateUpdate: {
    success: boolean;
    workflowState?: {
      id: string;
      name: string;
      type: string;
      color: string;
    };
  };
}

export const updateWorkflowState = {
  name: 'linear.update_workflow_state',
  description: 'Update a workflow state in Linear',
  parameters: updateWorkflowStateParams,

  async execute(
    input: UpdateWorkflowStateInput,
    testToken?: string
  ): Promise<UpdateWorkflowStateOutput> {
    const validated = updateWorkflowStateParams.parse(input);
    const client = await createLinearClient(testToken);

    const mutationInput: Record<string, unknown> = {};
    if (validated.name) mutationInput.name = validated.name;
    if (validated.color) mutationInput.color = validated.color;
    if (validated.position !== undefined) mutationInput.position = validated.position;
    if (validated.description) mutationInput.description = validated.description;

    const response = await executeGraphQL<WorkflowStateUpdateResponse>(
      client,
      UPDATE_WORKFLOW_STATE_MUTATION,
      { id: validated.id, input: mutationInput }
    );

    if (!response.workflowStateUpdate?.success || !response.workflowStateUpdate?.workflowState) {
      throw new Error('Failed to update workflow state');
    }

    const baseData = {
      success: response.workflowStateUpdate.success,
      workflowState: {
        id: response.workflowStateUpdate.workflowState.id,
        name: response.workflowStateUpdate.workflowState.name,
        type: response.workflowStateUpdate.workflowState.type,
        color: response.workflowStateUpdate.workflowState.color
      }
    };

    return updateWorkflowStateOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 350,
    reduction: '99%'
  }
};
