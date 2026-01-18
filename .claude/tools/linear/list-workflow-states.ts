/**
 * list_workflow_states - Linear GraphQL Wrapper
 *
 * List workflow states from Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS (all optional):
 * - filter: object - Filter options
 *   - teamId: string - Filter by team UUID
 * - limit: number - Number of results (default 100, max 250)
 *
 * OUTPUT fields per workflow state:
 * - id: string (required)
 * - name: string (required)
 * - type: string (required) - One of: backlog, unstarted, started, completed, canceled, triage
 * - color: string (required) - Hex color
 * - position: number (required) - Sort position
 * - description: string | null
 * - teamId: string (optional)
 * - teamName: string (optional)
 *
 * @example
 * ```typescript
 * const states = await listWorkflowStates.execute({});
 * const teamStates = await listWorkflowStates.execute({ filter: { teamId: 'team-uuid' } });
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

const LIST_WORKFLOW_STATES_QUERY = `
  query WorkflowStates($first: Int, $filter: WorkflowStateFilter) {
    workflowStates(first: $first, filter: $filter) {
      nodes {
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
  }
`;

export const listWorkflowStatesParams = z.object({
  filter: z.object({
    teamId: z.string()
      .refine(validateNoControlChars, 'Control characters not allowed')
      .refine(validateNoPathTraversal, 'Path traversal not allowed')
      .refine(validateNoCommandInjection, 'Invalid characters detected')
      .optional()
  }).optional().describe('Filter options'),
  limit: z.number().min(1).max(250).optional().default(100).describe('Number of results')
});

export type ListWorkflowStatesInput = {
  limit?: number;
  filter?: {
    teamId?: string;
  };
};

export const listWorkflowStatesOutput = z.object({
  workflowStates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['backlog', 'unstarted', 'started', 'completed', 'canceled', 'triage']),
    color: z.string(),
    position: z.number(),
    description: z.string().optional(),
    teamId: z.string().optional(),
    teamName: z.string().optional()
  })),
  totalStates: z.number(),
  estimatedTokens: z.number()
});

export type ListWorkflowStatesOutput = z.infer<typeof listWorkflowStatesOutput>;

interface WorkflowStatesResponse {
  workflowStates: {
    nodes: Array<{
      id: string;
      name: string;
      type: string;
      color: string;
      position: number;
      description?: string | null;
      team?: { id: string; name: string } | null;
    }>;
  };
}

export const listWorkflowStates = {
  name: 'linear.list_workflow_states',
  description: 'List workflow states from Linear',
  parameters: listWorkflowStatesParams,

  async execute(
    input: ListWorkflowStatesInput = {},
    testToken?: string
  ): Promise<ListWorkflowStatesOutput> {
    const validated = listWorkflowStatesParams.parse(input);
    const client = await createLinearClient(testToken);

    const filter: Record<string, unknown> = {};
    if (validated.filter?.teamId) {
      filter.team = { id: { eq: validated.filter.teamId } };
    }

    const response = await executeGraphQL<WorkflowStatesResponse>(
      client,
      LIST_WORKFLOW_STATES_QUERY,
      { first: validated.limit, filter: Object.keys(filter).length ? filter : undefined }
    );

    const states = response.workflowStates?.nodes || [];

    const baseData = {
      workflowStates: states.map(state => ({
        id: state.id,
        name: state.name,
        type: state.type,
        color: state.color,
        position: state.position,
        description: state.description || undefined,
        teamId: state.team?.id,
        teamName: state.team?.name
      })),
      totalStates: states.length
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    return listWorkflowStatesOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
