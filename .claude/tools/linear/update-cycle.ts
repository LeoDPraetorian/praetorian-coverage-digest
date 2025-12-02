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
 * Schema Discovery Results (tested with CHARIOT workspace):
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
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

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
  updatedAt: z.string().optional()
});

export type UpdateCycleOutput = z.infer<typeof updateCycleOutput>;

/**
 * Update a cycle in Linear using MCP wrapper
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

  async execute(input: UpdateCycleInput): Promise<UpdateCycleOutput> {
    // Validate input
    const validated = updateCycleParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'update_cycle',
      validated
    );

    if (!rawData) {
      throw new Error(`Cycle not found: ${validated.id}`);
    }

    // Filter to essential fields
    const filtered = {
      id: rawData.id,
      name: rawData.name,
      number: rawData.number,
      team: rawData.team ? {
        id: rawData.team.id,
        name: rawData.team.name
      } : undefined,
      startsAt: rawData.startsAt,
      endsAt: rawData.endsAt,
      updatedAt: rawData.updatedAt
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
