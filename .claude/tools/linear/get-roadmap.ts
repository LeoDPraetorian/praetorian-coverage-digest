/**
 * get_roadmap - Linear GraphQL Wrapper
 *
 * Get a roadmap by ID from Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (roadmap details)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * @example
 * ```typescript
 * import { getRoadmap } from './.claude/tools/linear';
 *
 * // Get by UUID
 * const roadmap = await getRoadmap.execute({ id: 'roadmap-uuid-123' });
 *
 * console.log(roadmap.name, roadmap.slugId);
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
 * GraphQL query for getting a roadmap
 */
const GET_ROADMAP_QUERY = `
  query Roadmap($id: String!) {
    roadmap(id: $id) {
      id
      name
      slugId
      description
      createdAt
      updatedAt
    }
  }
`;

/**
 * Input validation schema
 * Maps to get_roadmap params
 *
 * Security: Uses individual validators for specific attack detection
 */
export const getRoadmapParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Roadmap ID'),
});

export type GetRoadmapInput = z.infer<typeof getRoadmapParams>;

/**
 * Output schema - minimal essential fields
 */
export const getRoadmapOutput = z.object({
  id: z.string(),
  name: z.string(),
  slugId: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  estimatedTokens: z.number()
});

export type GetRoadmapOutput = z.infer<typeof getRoadmapOutput>;

/**
 * GraphQL response type
 */
interface RoadmapResponse {
  roadmap: {
    id: string;
    name: string;
    slugId: string;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

/**
 * Get a Linear roadmap by ID using GraphQL API
 *
 * @example
 * ```typescript
 * import { getRoadmap } from './.claude/tools/linear';
 *
 * // Get by UUID
 * const roadmap = await getRoadmap.execute({ id: 'roadmap-uuid-123' });
 *
 * console.log(roadmap.name, roadmap.slugId);
 * ```
 */
export const getRoadmap = {
  name: 'linear.roadmap',
  description: 'Get detailed information about a specific Linear roadmap',
  parameters: getRoadmapParams,

  async execute(
    input: GetRoadmapInput,
    testToken?: string
  ): Promise<GetRoadmapOutput> {
    // Validate input
    const validated = getRoadmapParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<RoadmapResponse>(
      client,
      GET_ROADMAP_QUERY,
      { id: validated.id }
    );

    if (!response.roadmap) {
      throw new Error(`Roadmap not found: ${validated.id}`);
    }

    // Filter to essential fields
    const baseData = {
      id: response.roadmap.id,
      name: response.roadmap.name,
      slugId: response.roadmap.slugId,
      description: response.roadmap.description || undefined,
      createdAt: response.roadmap.createdAt,
      updatedAt: response.roadmap.updatedAt,
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return getRoadmapOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
