/**
 * get_workflow_state - Linear GraphQL Wrapper
 *
 * Get a single workflow state by ID from Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~250 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Workflow state UUID
 *
 * OUTPUT:
 * - workflowState: object with id, name, type, color, position, description, teamId, teamName
 *
 * @example
 * ```typescript
 * const state = await getWorkflowState.execute({ id: 'state-uuid' });
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

const GET_WORKFLOW_STATE_QUERY = `
  query WorkflowState($id: String!) {
    workflowState(id: $id) {
      id
      name
      type
      color
      position
      description
      team {
        id
        name
      }
    }
  }
`;

export const getWorkflowStateParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Workflow state ID')
});

export type GetWorkflowStateInput = z.infer<typeof getWorkflowStateParams>;

export const getWorkflowStateOutput = z.object({
  workflowState: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['backlog', 'unstarted', 'started', 'completed', 'canceled']),
    color: z.string(),
    position: z.number(),
    description: z.string().optional(),
    teamId: z.string().optional(),
    teamName: z.string().optional()
  }),
  estimatedTokens: z.number()
});

export type GetWorkflowStateOutput = z.infer<typeof getWorkflowStateOutput>;

interface WorkflowStateResponse {
  workflowState: {
    id: string;
    name: string;
    type: string;
    color: string;
    position: number;
    description?: string | null;
    team?: { id: string; name: string } | null;
  } | null;
}

export const getWorkflowState = {
  name: 'linear.get_workflow_state',
  description: 'Get a workflow state by ID from Linear',
  parameters: getWorkflowStateParams,

  async execute(
    input: GetWorkflowStateInput,
    testToken?: string
  ): Promise<GetWorkflowStateOutput> {
    const validated = getWorkflowStateParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<WorkflowStateResponse>(
      client,
      GET_WORKFLOW_STATE_QUERY,
      { id: validated.id }
    );

    if (!response.workflowState) {
      throw new Error(`Workflow state not found: ${validated.id}`);
    }

    const state = response.workflowState;
    const baseData = {
      workflowState: {
        id: state.id,
        name: state.name,
        type: state.type,
        color: state.color,
        position: state.position,
        description: state.description || undefined,
        teamId: state.team?.id,
        teamName: state.team?.name
      }
    };

    return getWorkflowStateOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 250,
    reduction: '99%'
  }
};
