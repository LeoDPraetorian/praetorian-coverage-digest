/**
 * create_workflow_state - Linear GraphQL Wrapper
 *
 * Create a new workflow state in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~350 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - name: string (required) - State name
 * - type: string (required) - One of: backlog, unstarted, started, completed, canceled
 * - teamId: string (required) - Team UUID to scope the state to
 * - color: string (optional) - Hex color code (e.g., #f2c94c)
 * - position: number (optional) - Sort position
 * - description: string (optional) - State description
 *
 * OUTPUT:
 * - success: boolean
 * - workflowState: object with id, name, type, color
 *
 * @example
 * ```typescript
 * const state = await createWorkflowState.execute({
 *   name: 'In Review',
 *   type: 'started',
 *   teamId: 'team-uuid',
 *   color: '#f2c94c'
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

const CREATE_WORKFLOW_STATE_MUTATION = `
  mutation WorkflowStateCreate($input: WorkflowStateCreateInput!) {
    workflowStateCreate(input: $input) {
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

export const createWorkflowStateParams = z.object({
  name: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('State name'),
  type: z.enum(['backlog', 'unstarted', 'started', 'completed', 'canceled'])
    .describe('State type'),
  teamId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Team ID to scope state'),
  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be hex color (e.g., #f2c94c)')
    .optional()
    .describe('Hex color code'),
  position: z.number()
    .min(0)
    .optional()
    .describe('Sort position'),
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('State description')
});

export type CreateWorkflowStateInput = z.infer<typeof createWorkflowStateParams>;

export const createWorkflowStateOutput = z.object({
  success: z.boolean(),
  workflowState: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    color: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateWorkflowStateOutput = z.infer<typeof createWorkflowStateOutput>;

interface WorkflowStateCreateResponse {
  workflowStateCreate: {
    success: boolean;
    workflowState?: {
      id: string;
      name: string;
      type: string;
      color: string;
    };
  };
}

export const createWorkflowState = {
  name: 'linear.create_workflow_state',
  description: 'Create a new workflow state in Linear',
  parameters: createWorkflowStateParams,

  async execute(
    input: CreateWorkflowStateInput,
    testToken?: string
  ): Promise<CreateWorkflowStateOutput> {
    const validated = createWorkflowStateParams.parse(input);
    const client = await createLinearClient(testToken);

    const mutationInput: Record<string, unknown> = {
      name: validated.name,
      type: validated.type,
      teamId: validated.teamId
    };
    if (validated.color) mutationInput.color = validated.color;
    if (validated.position !== undefined) mutationInput.position = validated.position;
    if (validated.description) mutationInput.description = validated.description;

    const response = await executeGraphQL<WorkflowStateCreateResponse>(
      client,
      CREATE_WORKFLOW_STATE_MUTATION,
      { input: mutationInput }
    );

    if (!response.workflowStateCreate?.success || !response.workflowStateCreate?.workflowState) {
      throw new Error('Failed to create workflow state');
    }

    const baseData = {
      success: response.workflowStateCreate.success,
      workflowState: {
        id: response.workflowStateCreate.workflowState.id,
        name: response.workflowStateCreate.workflowState.name,
        type: response.workflowStateCreate.workflowState.type,
        color: response.workflowStateCreate.workflowState.color
      }
    };

    return createWorkflowStateOutput.parse({
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
