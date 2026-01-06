/**
 * list_cycles - Linear MCP Wrapper
 *
 * List cycles from Linear workspace via MCP server
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
 * - MCP returns array directly, not wrapped in { cycles: [...] }
 * - Empty search returns empty array, not error
 * - Cycles are team-specific; filter by team for relevant results
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
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

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
  totalCycles: z.number()
});

export type ListCyclesOutput = z.infer<typeof listCyclesOutput>;

/**
 * List cycles from Linear using MCP wrapper
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
 * ```
 */
export const listCycles = {
  name: 'linear.list_cycles',
  description: 'List cycles from Linear workspace',
  parameters: listCyclesParams,

  async execute(input: ListCyclesInput): Promise<ListCyclesOutput> {
    // Validate input
    const validated = listCyclesParams.parse(input);

    // Map parameter names: wrapper uses 'team', MCP expects 'teamId'
    const { team, ...rest } = validated;
    const mcpParams = {
      ...rest,
      ...(team ? { teamId: team } : {})
    };

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'list_cycles',
      mcpParams
    );

    // callMCPTool already parses JSON from MCP response
    // Linear returns { content: [{cycle1}, {cycle2}, ...] }
    const cycles = rawData.content || rawData.cycles || (Array.isArray(rawData) ? rawData : []);

    // Filter to essential fields
    const filtered = {
      cycles: cycles.map((cycle: any) => ({
        id: cycle.id,
        name: cycle.name,
        number: cycle.number,
        team: cycle.team ? {
          id: cycle.team.id,
          name: cycle.team.name
        } : undefined,
        startsAt: cycle.startsAt,
        endsAt: cycle.endsAt,
        createdAt: cycle.createdAt,
        updatedAt: cycle.updatedAt
      })),
      totalCycles: cycles.length
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
