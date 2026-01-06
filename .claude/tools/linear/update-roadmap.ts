/**
 * update_roadmap - Linear MCP Wrapper
 *
 * Update a roadmap's properties in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (update response)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * @example
 * ```typescript
 * // Update name
 * await updateRoadmap.execute({
 *   id: 'roadmap-uuid',
 *   name: 'New Roadmap Name'
 * });
 *
 * // Update description
 * await updateRoadmap.execute({
 *   id: 'roadmap-uuid',
 *   description: 'Updated description'
 * });
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
 * GraphQL mutation for updating a roadmap
 */
const UPDATE_ROADMAP_MUTATION = `
  mutation UpdateRoadmap($id: String!, $input: RoadmapUpdateInput!) {
    roadmapUpdate(id: $id, input: $input) {
      success
      roadmap {
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

export const updateRoadmapParams = z.object({
  // Reference field - full validation
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Roadmap ID'),
  // User content - control chars only
  name: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Roadmap name'),
  // User content - control chars only
  description: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Roadmap description'),
});

export type UpdateRoadmapInput = z.infer<typeof updateRoadmapParams>;

/**
 * Output schema - minimal essential fields
 */
export const updateRoadmapOutput = z.object({
  id: z.string(),
  name: z.string(),
  slugId: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  estimatedTokens: z.number()
});

export type UpdateRoadmapOutput = z.infer<typeof updateRoadmapOutput>;

/**
 * GraphQL response type
 */
interface RoadmapUpdateResponse {
  roadmapUpdate: {
    success: boolean;
    roadmap: {
      id: string;
      name: string;
      slugId: string;
      description?: string;
      createdAt: string;
      updatedAt: string;
    } | null;
  };
}

/**
 * Update a roadmap in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { updateRoadmap } from './.claude/tools/linear';
 *
 * // Update roadmap name
 * const roadmap = await updateRoadmap.execute({ id: 'roadmap-uuid', name: 'New Name' });
 * ```
 */
export const updateRoadmap = {
  name: 'linear.update_roadmap',
  description: 'Update roadmap properties',
  parameters: updateRoadmapParams,

  async execute(
    input: UpdateRoadmapInput,
    testToken?: string
  ): Promise<UpdateRoadmapOutput> {
    // Validate input
    const validated = updateRoadmapParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build mutation input (only include fields that were provided)
    const mutationInput: Record<string, any> = {};
    if (validated.name !== undefined) mutationInput.name = validated.name;
    if (validated.description !== undefined) mutationInput.description = validated.description;

    // Execute GraphQL mutation
    const response = await executeGraphQL<RoadmapUpdateResponse>(
      client,
      UPDATE_ROADMAP_MUTATION,
      { id: validated.id, input: mutationInput }
    );

    if (!response.roadmapUpdate.roadmap) {
      throw new Error(`Roadmap not found: ${validated.id}`);
    }

    // Filter to essential fields
    const baseData = {
      id: response.roadmapUpdate.roadmap.id,
      name: response.roadmapUpdate.roadmap.name,
      slugId: response.roadmapUpdate.roadmap.slugId,
      description: response.roadmapUpdate.roadmap.description,
      createdAt: response.roadmapUpdate.roadmap.createdAt,
      updatedAt: response.roadmapUpdate.roadmap.updatedAt
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return updateRoadmapOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
