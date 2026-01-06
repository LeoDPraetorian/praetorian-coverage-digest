/**
 * get_cycle - Linear GraphQL Wrapper
 *
 * Get detailed information about a specific cycle via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (single cycle)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - id: string (required) - Cycle UUID
 *
 * OUTPUT (after filtering):
 * - id: string - Cycle UUID
 * - name: string - Cycle display name
 * - description: string (optional) - Cycle description
 * - number: number (optional) - Cycle number
 * - team: object (optional) - Associated team
 *   - id: string - Team UUID
 *   - name: string - Team name
 * - startsAt: string (optional) - ISO date for cycle start
 * - endsAt: string (optional) - ISO date for cycle end
 * - createdAt: string (optional) - ISO timestamp
 * - updatedAt: string (optional) - ISO timestamp
 *
 * Edge cases discovered:
 * - Returns null/undefined if cycle not found
 * - All optional fields may be missing
 *
 * @example
 * ```typescript
 * // Get cycle by ID
 * await getCycle.execute({ id: 'cycle-uuid' });
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
 * GraphQL query for getting a cycle
 */
const GET_CYCLE_QUERY = `
  query Cycle($id: String!) {
    cycle(id: $id) {
      id
      name
      description
      number
      team {
        id
        name
      }
      startsAt
      endsAt
      createdAt
      updatedAt
    }
  }
`;

/**
 * Input validation schema
 * Maps to get_cycle params
 */
export const getCycleParams = z.object({
  // Reference field - full validation
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Cycle UUID'),
});

export type GetCycleInput = z.infer<typeof getCycleParams>;

/**
 * Output schema - minimal essential fields
 */
export const getCycleOutput = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  number: z.number().optional(),
  team: z.object({
    id: z.string(),
    name: z.string()
  }).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  estimatedTokens: z.number()
});

export type GetCycleOutput = z.infer<typeof getCycleOutput>;

/**
 * GraphQL response type
 */
interface CycleResponse {
  cycle: {
    id: string;
    name: string;
    description?: string | null;
    number?: number | null;
    team?: {
      id: string;
      name: string;
    } | null;
    startsAt?: string | null;
    endsAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
}

/**
 * Get a Linear cycle by ID using GraphQL API
 *
 * @example
 * ```typescript
 * import { getCycle } from './.claude/tools/linear';
 *
 * // Get cycle by ID
 * const cycle = await getCycle.execute({ id: 'cycle-uuid' });
 * console.log(cycle.name); // "Sprint 1"
 * ```
 */
export const getCycle = {
  name: 'linear.get_cycle',
  description: 'Get detailed information about a specific Linear cycle',
  parameters: getCycleParams,

  async execute(
    input: GetCycleInput,
    testToken?: string
  ): Promise<GetCycleOutput> {
    // Validate input
    const validated = getCycleParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<CycleResponse>(
      client,
      GET_CYCLE_QUERY,
      { id: validated.id }
    );

    if (!response.cycle) {
      throw new Error(`Cycle not found: ${validated.id}`);
    }

    // Filter to essential fields
    const baseData = {
      id: response.cycle.id,
      name: response.cycle.name,
      description: response.cycle.description ?? undefined,
      number: response.cycle.number ?? undefined,
      team: response.cycle.team ? {
        id: response.cycle.team.id,
        name: response.cycle.team.name
      } : undefined,
      startsAt: response.cycle.startsAt ?? undefined,
      endsAt: response.cycle.endsAt ?? undefined,
      createdAt: response.cycle.createdAt ?? undefined,
      updatedAt: response.cycle.updatedAt ?? undefined
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return getCycleOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '99%'
  }
};
