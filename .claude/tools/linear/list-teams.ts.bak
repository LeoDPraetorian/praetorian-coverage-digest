/**
 * list_teams - Linear MCP Wrapper
 *
 * List teams from Linear workspace via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (team list)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - query: string (optional) - Search query to filter teams
 * - includeArchived: boolean (optional) - Include archived teams
 * - limit: number (optional) - Max teams to return (1-250, default 50)
 * - orderBy: enum (optional) - Sort order: 'createdAt' | 'updatedAt'
 *
 * OUTPUT (after filtering):
 * - teams: array of team objects
 *   - id: string - Team UUID
 *   - key: string (optional) - Team key/slug (e.g., "ENG")
 *   - name: string - Team display name
 *   - description: string (optional) - Team description (truncated to 200 chars)
 *   - createdAt: string (optional) - ISO timestamp
 *   - updatedAt: string (optional) - ISO timestamp
 * - totalTeams: number - Count of returned teams
 *
 * Edge cases discovered:
 * - MCP returns array directly, not wrapped in { teams: [...] }
 * - Empty search returns empty array, not error
 * - Description truncated to 200 chars for token efficiency
 *
 * @example
 * ```typescript
 * // List all teams
 * await listTeams.execute({});
 *
 * // Search teams
 * await listTeams.execute({ query: 'Engineering' });
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
 * Maps to list_teams params
 */
export const listTeamsParams = z.object({
  // Search query - full validation
  query: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Search query'),
  includeArchived: z.boolean().default(false).optional(),
  limit: z.number().min(1).max(250).default(50).optional(),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt').optional()
});

export type ListTeamsInput = z.infer<typeof listTeamsParams>;

/**
 * Output schema - minimal essential fields
 */
export const listTeamsOutput = z.object({
  teams: z.array(z.object({
    id: z.string(),
    name: z.string(),
    key: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })),
  totalTeams: z.number()
});

export type ListTeamsOutput = z.infer<typeof listTeamsOutput>;

/**
 * List teams from Linear using MCP wrapper
 *
 * @example
 * ```typescript
 * import { listTeams } from './.claude/tools/linear';
 *
 * // List all teams
 * const teams = await listTeams.execute({});
 *
 * // Search teams
 * const searchResults = await listTeams.execute({ query: 'Engineering' });
 * ```
 */
export const listTeams = {
  name: 'linear.list_teams',
  description: 'List teams from Linear workspace',
  parameters: listTeamsParams,

  async execute(input: ListTeamsInput): Promise<ListTeamsOutput> {
    // Validate input
    const validated = listTeamsParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'list_teams',
      validated
    );

    // Filter to essential fields
    // Linear MCP returns array directly, not { teams: [...] }
    const teams = Array.isArray(rawData) ? rawData : (rawData.teams || []);
    const filtered = {
      teams: teams.map((team: any) => ({
        id: team.id,
        key: team.key,
        name: team.name,
        description: team.description?.substring(0, 200), // Truncate for token efficiency
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      })),
      totalTeams: teams.length
    };

    // Validate output
    return listTeamsOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
