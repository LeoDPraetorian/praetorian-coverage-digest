/**
 * list_teams - Linear GraphQL Wrapper
 *
 * List teams from Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (team list)
 * - vs MCP: Consistent behavior, no server dependency
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
 * - Empty search returns empty array, not error
 * - Description truncated to 200 chars for token efficiency
 *
 * @example
 * ```typescript
 * // List all teams
 * const result = await listTeams.execute({});
 *
 * // Search teams
 * const result = await listTeams.execute({ query: 'Engineering' });
 *
 * // With test token
 * const result = await listTeams.execute({}, 'test-token');
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
 * GraphQL query for listing teams
 */
const LIST_TEAMS_QUERY = `
  query ListTeams($filter: TeamFilter, $first: Int, $orderBy: PaginationOrderBy) {
    teams(filter: $filter, first: $first, orderBy: $orderBy) {
      nodes {
        id
        key
        name
        description
        createdAt
        updatedAt
      }
    }
  }
`;

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
  totalTeams: z.number(),
  estimatedTokens: z.number()
});

export type ListTeamsOutput = z.infer<typeof listTeamsOutput>;

/**
 * GraphQL response type
 */
interface TeamsResponse {
  teams: {
    nodes: Array<{
      id: string;
      key?: string | null;
      name: string;
      description?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>;
  } | null;
}

/**
 * List teams from Linear using GraphQL API
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
 *
 * // With test token
 * const teams2 = await listTeams.execute({}, 'test-token');
 * ```
 */
export const listTeams = {
  name: 'linear.list_teams',
  description: 'List teams from Linear workspace',
  parameters: listTeamsParams,

  async execute(
    input: ListTeamsInput,
    testToken?: string
  ): Promise<ListTeamsOutput> {
    // Validate input
    const validated = listTeamsParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build GraphQL variables
    const variables: Record<string, unknown> = {
      first: validated.limit || 50,
      orderBy: validated.orderBy || 'updatedAt',
    };

    // Add filter if query or includeArchived provided
    if (validated.query || validated.includeArchived !== undefined) {
      const filter: Record<string, unknown> = {};
      if (validated.query) {
        filter.name = { contains: validated.query };
      }
      if (validated.includeArchived !== undefined) {
        filter.includeArchived = validated.includeArchived;
      }
      variables.filter = filter;
    }

    // Execute GraphQL query
    const response = await executeGraphQL<TeamsResponse>(
      client,
      LIST_TEAMS_QUERY,
      variables
    );

    // Extract teams array (handle null/undefined)
    const teams = response.teams?.nodes || [];

    // Filter to essential fields
    const baseData = {
      teams: teams.map((team) => ({
        id: team.id,
        key: team.key || undefined,
        name: team.name,
        description: team.description?.substring(0, 200) || undefined, // Truncate for token efficiency
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      })),
      totalTeams: teams.length,
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData),
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
