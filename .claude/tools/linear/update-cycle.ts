/**
 * update_cycle - Linear MCP Wrapper
 *
 * Update a cycle in Linear workspace via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (single cycle)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Cycle UUID to update
 * - name: string (optional) - New name for the cycle
 * - startsAt: string (optional) - New start date (ISO format)
 * - endsAt: string (optional) - New end date (ISO format)
 *
 * OUTPUT (after filtering):
 * - id: string - Cycle UUID
 * - name: string - Cycle display name
 * - number: number (optional) - Cycle number
 * - team: object (optional) - Associated team
 * - startsAt: string (optional) - ISO date for cycle start
 * - endsAt: string (optional) - ISO date for cycle end
 * - updatedAt: string - ISO timestamp of update
 *
 * Edge cases discovered:
 * - MCP returns the updated cycle directly
 * - Only provided fields are updated; omitted fields remain unchanged
 * - Date validation happens on the server side
 *
 * @example
 * ```typescript
 * // Update cycle name
 * await updateCycle.execute({ id: 'cycle-uuid', name: 'Sprint 2' });
 *
 * // Update cycle dates
 * await updateCycle.execute({ id: 'cycle-uuid', startsAt: '2025-02-01', endsAt: '2025-02-14' });
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
import type { HTTPPort } from '../config/lib/http-client.js';

/**
 * GraphQL mutation for updating a cycle
 */
const UPDATE_CYCLE_MUTATION = `
  mutation UpdateCycle($id: String!, $input: CycleUpdateInput!) {
    cycleUpdate(id: $id, input: $input) {
      success
      cycle {
        id
        name
        number
        team {
          id
          name
        }
        startsAt
        endsAt
        updatedAt
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to update_cycle params
 */
export const updateCycleParams = z.object({
  // Reference field - full validation
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Cycle UUID to update'),
  // User content - only block control chars
  name: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('New name for the cycle'),
  // Date field - control chars only
  startsAt: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('New start date (ISO format)'),
  // Date field - control chars only
  endsAt: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('New end date (ISO format)')
});

export type UpdateCycleInput = z.infer<typeof updateCycleParams>;

/**
 * Output schema - minimal essential fields
 */
export const updateCycleOutput = z.object({
  id: z.string(),
  name: z.string(),
  number: z.number().optional(),
  team: z.object({
    id: z.string(),
    name: z.string()
  }).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  updatedAt: z.string().optional(),
  estimatedTokens: z.number()
});

export type UpdateCycleOutput = z.infer<typeof updateCycleOutput>;

/**
 * GraphQL response type
 */
interface CycleUpdateResponse {
  cycleUpdate: {
    success: boolean;
    cycle: {
      id: string;
      name: string;
      number?: number;
      team?: {
        id: string;
        name: string;
      } | null;
      startsAt?: string;
      endsAt?: string;
      updatedAt?: string;
    } | null;
  };
}

/**
 * Update a cycle in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { updateCycle } from './.claude/tools/linear';
 *
 * // Update cycle name
 * const cycle = await updateCycle.execute({ id: 'cycle-uuid', name: 'Sprint 2' });
 * ```
 */
export const updateCycle = {
  name: 'linear.update_cycle',
  description: 'Update a cycle in Linear workspace',
  parameters: updateCycleParams,

  async execute(
    input: UpdateCycleInput,
    testToken?: string
  ): Promise<UpdateCycleOutput> {
    // Validate input
    const validated = updateCycleParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build mutation input (only include fields that were provided)
    const mutationInput: Record<string, any> = {};
    if (validated.name !== undefined) mutationInput.name = validated.name;
    if (validated.startsAt !== undefined) mutationInput.startsAt = validated.startsAt;
    if (validated.endsAt !== undefined) mutationInput.endsAt = validated.endsAt;

    // Execute GraphQL mutation
    const response = await executeGraphQL<CycleUpdateResponse>(
      client,
      UPDATE_CYCLE_MUTATION,
      { id: validated.id, input: mutationInput }
    );

    if (!response.cycleUpdate.cycle) {
      throw new Error(`Cycle not found: ${validated.id}`);
    }

    // Filter to essential fields
    const baseData = {
      id: response.cycleUpdate.cycle.id,
      name: response.cycleUpdate.cycle.name,
      number: response.cycleUpdate.cycle.number,
      team: response.cycleUpdate.cycle.team ? {
        id: response.cycleUpdate.cycle.team.id,
        name: response.cycleUpdate.cycle.team.name
      } : undefined,
      startsAt: response.cycleUpdate.cycle.startsAt,
      endsAt: response.cycleUpdate.cycle.endsAt,
      updatedAt: response.cycleUpdate.cycle.updatedAt
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return updateCycleOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '99%'
  }
};
