/**
 * list_roadmaps - Linear GraphQL Wrapper
 *
 * List roadmaps from Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~800 tokens (roadmap list)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - limit: number (optional) - Maximum number of roadmaps to return (1-250, default 50)
 *
 * OUTPUT (after filtering):
 * - roadmaps: array of roadmap objects
 *   - id: string - Roadmap UUID
 *   - name: string - Roadmap name
 *   - slugId: string - URL-friendly identifier
 *   - description: string (optional) - Roadmap description
 *   - createdAt: string - ISO timestamp
 *   - updatedAt: string - ISO timestamp
 * - totalRoadmaps: number - Count of roadmaps returned
 *
 * Edge cases discovered:
 * - Description may be null or undefined
 * - Empty roadmaps returns empty array, not null
 * - Limit parameter maps to GraphQL 'first' argument
 *
 * @example
 * ```typescript
 * // List all roadmaps
 * const result = await listRoadmaps.execute({});
 * console.log(`Found ${result.totalRoadmaps} roadmaps`);
 *
 * // List with limit
 * const result2 = await listRoadmaps.execute({ limit: 10 });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';

/**
 * GraphQL query for listing roadmaps
 */
const LIST_ROADMAPS_QUERY = `
  query Roadmaps($first: Int) {
    roadmaps(first: $first) {
      nodes {
        id
        name
        slugId
        description
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to list_roadmaps params
 */
export const listRoadmapsParams = z.object({
  limit: z.number().min(1).max(250).default(50).optional(),
});

export type ListRoadmapsInput = z.infer<typeof listRoadmapsParams>;

/**
 * Output schema - minimal essential fields
 */
export const listRoadmapsOutput = z.object({
  roadmaps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slugId: z.string(),
    description: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  totalRoadmaps: z.number(),
  estimatedTokens: z.number()
});

export type ListRoadmapsOutput = z.infer<typeof listRoadmapsOutput>;

/**
 * GraphQL response type
 */
interface RoadmapsResponse {
  roadmaps: {
    nodes: Array<{
      id: string;
      name: string;
      slugId: string;
      description?: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
  } | null;
}

/**
 * List roadmaps from Linear workspace using GraphQL API
 *
 * @example
 * ```typescript
 * import { listRoadmaps } from './.claude/tools/linear';
 *
 * // List all roadmaps
 * const roadmaps = await listRoadmaps.execute({});
 *
 * // With test token
 * const roadmaps2 = await listRoadmaps.execute({ limit: 10 }, 'test-token');
 * ```
 */
export const listRoadmaps = {
  name: 'linear.roadmaps',
  description: 'List all roadmaps from Linear workspace',
  parameters: listRoadmapsParams,

  async execute(
    input: ListRoadmapsInput,
    testToken?: string
  ): Promise<ListRoadmapsOutput> {
    // Validate input
    const validated = listRoadmapsParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<RoadmapsResponse>(
      client,
      LIST_ROADMAPS_QUERY,
      { first: validated.limit }
    );

    // Extract roadmaps array (handle null/undefined)
    const roadmaps = response.roadmaps?.nodes || [];

    // Filter to essential fields
    const baseData = {
      roadmaps: roadmaps.map((roadmap) => ({
        id: roadmap.id,
        name: roadmap.name,
        slugId: roadmap.slugId,
        description: roadmap.description || undefined, // Convert null to undefined
        createdAt: roadmap.createdAt,
        updatedAt: roadmap.updatedAt,
      })),
      totalRoadmaps: roadmaps.length,
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return listRoadmapsOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 800,
    reduction: '99%'
  }
};
