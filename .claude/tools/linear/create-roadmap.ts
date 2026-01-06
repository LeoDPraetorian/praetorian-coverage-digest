/**
 * create_roadmap - Linear GraphQL Wrapper
 *
 * Create a new roadmap in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (creation response)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - name: string (required) - Roadmap name
 * - description: string (optional) - Full roadmap description (Markdown)
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether creation succeeded
 * - roadmap: object - Created roadmap details
 *   - id: string - Roadmap UUID
 *   - name: string - Roadmap display name
 *   - slugId: string - URL-friendly slug
 *   - description: string (optional) - Roadmap description
 *
 * Edge cases discovered:
 * - GraphQL returns { success: true, roadmap: {...} } on success
 * - slugId is auto-generated from name
 *
 * @example
 * ```typescript
 * // Create simple roadmap
 * await createRoadmap.execute({ name: 'Q2 2025 Product Roadmap' });
 *
 * // Create with description
 * await createRoadmap.execute({
 *   name: 'Q3 2025 Engineering Initiatives',
 *   description: 'Key engineering priorities for Q3 2025...'
 * });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoControlCharsAllowWhitespace,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';

/**
 * GraphQL mutation for creating a roadmap
 */
const CREATE_ROADMAP_MUTATION = `
  mutation RoadmapCreate($input: RoadmapCreateInput!) {
    roadmapCreate(input: $input) {
      success
      roadmap {
        id
        name
        slugId
        description
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to create_roadmap params
 */
export const createRoadmapParams = z.object({
  // User content - control chars only
  name: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Roadmap name'),
  // User content - allow newlines for markdown
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Control characters not allowed')
    .optional()
    .describe('Full roadmap description (Markdown)'),
});

export type CreateRoadmapInput = z.infer<typeof createRoadmapParams>;

/**
 * Output schema - minimal essential fields
 */
export const createRoadmapOutput = z.object({
  success: z.boolean(),
  roadmap: z.object({
    id: z.string(),
    name: z.string(),
    slugId: z.string(),
    description: z.string().optional(),
  }),
  estimatedTokens: z.number()
});

export type CreateRoadmapOutput = z.infer<typeof createRoadmapOutput>;

/**
 * GraphQL response type
 */
interface RoadmapCreateResponse {
  roadmapCreate: {
    success: boolean;
    roadmap?: {
      id: string;
      name: string;
      slugId: string;
      description?: string;
    };
  };
}

/**
 * Create a new roadmap in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { createRoadmap } from './.claude/tools/linear';
 *
 * // Create simple roadmap
 * const result = await createRoadmap.execute({
 *   name: 'Q2 2025 Product Roadmap'
 * });
 *
 * // Create with description
 * const result2 = await createRoadmap.execute({
 *   name: 'Q3 2025 Engineering Initiatives',
 *   description: 'Key engineering priorities for Q3 2025...'
 * });
 * ```
 */
export const createRoadmap = {
  name: 'linear.create_roadmap',
  description: 'Create a new roadmap in Linear',
  parameters: createRoadmapParams,

  async execute(
    input: CreateRoadmapInput,
    testToken?: string
  ): Promise<CreateRoadmapOutput> {
    // Validate input
    const validated = createRoadmapParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build GraphQL input
    const mutationInput: {
      name: string;
      description?: string;
    } = {
      name: validated.name,
    };

    if (validated.description) {
      mutationInput.description = validated.description;
    }

    // Execute GraphQL mutation
    const response = await executeGraphQL<RoadmapCreateResponse>(
      client,
      CREATE_ROADMAP_MUTATION,
      { input: mutationInput }
    );

    if (!response.roadmapCreate?.success || !response.roadmapCreate?.roadmap) {
      throw new Error('Failed to create roadmap');
    }

    // Filter to essential fields
    const baseData = {
      success: response.roadmapCreate.success,
      roadmap: {
        id: response.roadmapCreate.roadmap.id,
        name: response.roadmapCreate.roadmap.name,
        slugId: response.roadmapCreate.roadmap.slugId,
        description: response.roadmapCreate.roadmap.description,
      }
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return createRoadmapOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
