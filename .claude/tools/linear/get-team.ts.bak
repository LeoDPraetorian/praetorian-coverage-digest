/**
 * get_team - Linear MCP Wrapper
 *
 * Get detailed information about a specific team via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (single team)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - query: string (required) - Team UUID, key, or name
 *
 * OUTPUT (after filtering):
 * - id: string - Team UUID
 * - key: string (optional) - Team key/slug (e.g., "ENG")
 * - name: string - Team display name
 * - description: string (optional) - Team description (truncated to 500 chars)
 * - createdAt: string (optional) - ISO timestamp
 * - updatedAt: string (optional) - ISO timestamp
 *
 * Edge cases discovered:
 * - Query can match by UUID, key, or name (fuzzy matching)
 * - Returns null/undefined if team not found
 * - Description truncated to 500 chars for token efficiency
 *
 * @example
 * ```typescript
 * // Get by name
 * await getTeam.execute({ query: 'Engineering' });
 *
 * // Get by key
 * await getTeam.execute({ query: 'ENG' });
 *
 * // Get by UUID
 * await getTeam.execute({ query: '550e8400-e29b-41d4-a716-446655440000' });
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
 * Maps to get_team params
 */
export const getTeamParams = z.object({
  // Reference/search field - full validation
  query: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Team UUID, key, or name')
});

export type GetTeamInput = z.infer<typeof getTeamParams>;

/**
 * Output schema - minimal essential fields
 */
export const getTeamOutput = z.object({
  id: z.string(),
  key: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type GetTeamOutput = z.infer<typeof getTeamOutput>;

/**
 * Get a Linear team by UUID, key, or name using MCP wrapper
 *
 * @example
 * ```typescript
 * import { getTeam } from './.claude/tools/linear';
 *
 * // Get by name
 * const team = await getTeam.execute({ query: 'Engineering' });
 *
 * // Get by key
 * const team2 = await getTeam.execute({ query: 'ENG' });
 *
 * // Get by UUID
 * const team3 = await getTeam.execute({ query: 'abc123...' });
 * ```
 */
export const getTeam = {
  name: 'linear.get_team',
  description: 'Get detailed information about a specific Linear team',
  parameters: getTeamParams,

  async execute(input: GetTeamInput): Promise<GetTeamOutput> {
    // Validate input
    const validated = getTeamParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'get_team',
      validated
    );

    if (!rawData) {
      throw new Error(`Team not found: ${validated.query}`);
    }

    // Filter to essential fields
    const filtered = {
      id: rawData.id,
      key: rawData.key,
      name: rawData.name,
      description: rawData.description?.substring(0, 500), // Truncate for token efficiency
      createdAt: rawData.createdAt,
      updatedAt: rawData.updatedAt
    };

    // Validate output
    return getTeamOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
