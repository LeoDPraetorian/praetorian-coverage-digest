/**
 * list_cycles - Linear GraphQL Wrapper
 *
 * List cycles from Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (cycle list)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - team: string (optional) - Team name or ID to filter cycles
 * - query: string (optional) - Search query for cycle name
 * - includeArchived: boolean (optional) - Include archived cycles
 * - limit: number (optional) - Max cycles to return (1-250, default 50)
 *
 * OUTPUT (after filtering):
 * - cycles: array of cycle objects
 *   - id: string - Cycle UUID
 *   - name: string - Cycle display name
 *   - number: number - Cycle number
 *   - team: object (optional) - Associated team
 *   - startsAt: string (optional) - ISO date for cycle start
 *   - endsAt: string (optional) - ISO date for cycle end
 *   - createdAt: string (optional) - ISO timestamp
 *   - updatedAt: string (optional) - ISO timestamp
 * - totalCycles: number - Count of returned cycles
 *
 * Edge cases discovered:
 * - Empty search returns empty array, not error
 * - Cycles are team-specific; filter by team for relevant results
 * - All optional fields may be null/undefined
 *
 * @example
 * ```typescript
 * // List all cycles
 * await listCycles.execute({});
 *
 * // Filter by team
 * await listCycles.execute({ team: 'Engineering' });
 *
 * // Search cycles
 * await listCycles.execute({ query: 'Sprint 1' });
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
 * GraphQL query for listing cycles
 */
const LIST_CYCLES_QUERY = `
  query Cycles($filter: CycleFilter) {
    cycles(filter: $filter) {
      nodes {
        id
        name
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
  }
`;

/**
 * Input validation schema
 * Maps to list_cycles params
 */
export const listCyclesParams = z.object({
  // Reference field - full validation
  team: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Team name or ID'),
  // Search query - full validation
  query: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Search query for cycle name'),
  includeArchived: z.boolean().default(false).optional(),
  limit: z.number().min(1).max(250).default(50).optional()
});

export type ListCyclesInput = z.infer<typeof listCyclesParams>;

/**
 * Output schema - minimal essential fields
 */
export const listCyclesOutput = z.object({
  cycles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    number: z.number().optional(),
    team: z.object({
      id: z.string(),
      name: z.string()
    }).optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })),
  totalCycles: z.number(),
  estimatedTokens: z.number()
});

export type ListCyclesOutput = z.infer<typeof listCyclesOutput>;

/**
 * GraphQL response type
 */
interface CyclesResponse {
  cycles: {
    nodes: Array<{
      id: string;
      name: string;
      number?: number | null;
      team?: {
        id: string;
        name: string;
      } | null;
      startsAt?: string | null;
      endsAt?: string | null;
      createdAt?: string | null;
      updatedAt?: string | null;
    }>;
  } | null;
}

/**
 * List cycles from Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { listCycles } from './.claude/tools/linear';
 *
 * // List all cycles
 * const cycles = await listCycles.execute({});
 *
 * // Filter by team
 * const teamCycles = await listCycles.execute({ team: 'Engineering' });
 *
 * // With test token
 * const cycles2 = await listCycles.execute({ team: 'Product' }, 'test-token');
 * ```
 */
export const listCycles = {
  name: 'linear.list_cycles',
  description: 'List cycles from Linear workspace',
  parameters: listCyclesParams,

  async execute(
    input: ListCyclesInput,
    testToken?: string
  ): Promise<ListCyclesOutput> {
    // Validate input
    const validated = listCyclesParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build filter object for GraphQL (Linear API expects specific filter format)
    const filter: any = {};
    if (validated.team) {
      filter.team = { name: { eq: validated.team } };
    }
    if (validated.query) {
      filter.name = { contains: validated.query };
    }
    if (validated.includeArchived !== undefined) {
      filter.includeArchived = validated.includeArchived;
    }

    // Execute GraphQL query
    const response = await executeGraphQL<CyclesResponse>(
      client,
      LIST_CYCLES_QUERY,
      Object.keys(filter).length > 0 ? { filter } : {}
    );

    // Extract cycles array (handle null/undefined)
    const cycles = response.cycles?.nodes || [];

    // Filter to essential fields
    const baseData = {
      cycles: cycles.map((cycle) => ({
        id: cycle.id,
        name: cycle.name,
        number: cycle.number ?? undefined,
        team: cycle.team ? {
          id: cycle.team.id,
          name: cycle.team.name
        } : undefined,
        startsAt: cycle.startsAt ?? undefined,
        endsAt: cycle.endsAt ?? undefined,
        createdAt: cycle.createdAt ?? undefined,
        updatedAt: cycle.updatedAt ?? undefined
      })),
      totalCycles: cycles.length
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return listCyclesOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
