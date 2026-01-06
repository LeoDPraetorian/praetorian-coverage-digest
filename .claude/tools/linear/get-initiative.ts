/**
 * get_initiative - Linear GraphQL Wrapper
 *
 * Get detailed information about a specific initiative via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (single initiative)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * REQUIRED fields:
 * - id: string - Initiative UUID or name
 * - name: string - Initiative name
 *
 * OPTIONAL fields:
 * - description: string | null - Initiative description (truncated to 500 chars)
 * - targetDate: string | null - Target completion date (ISO format)
 * - createdAt: string - Creation timestamp (ISO format)
 * - updatedAt: string - Last update timestamp (ISO format)
 *
 * Edge cases discovered:
 * - Query can match by UUID or name
 * - Returns null/undefined if initiative not found
 * - Description truncated to 500 chars for token efficiency
 *
 * @example
 * ```typescript
 * // Get by name
 * await getInitiative.execute({ id: 'Q2 2025 Product Roadmap' });
 *
 * // Get by ID
 * await getInitiative.execute({ id: 'abc123-uuid-456' });
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
 * GraphQL query for getting an initiative
 */
const GET_INITIATIVE_QUERY = `
  query Initiative($id: String!) {
    initiative(id: $id) {
      id
      name
      description
      targetDate
      createdAt
      updatedAt
    }
  }
`;

/**
 * Input validation schema
 * Maps to get_initiative params
 *
 * Security: Uses individual validators for specific attack detection
 *
 * @field id - Initiative UUID or name (required) - full security validation
 */
export const getInitiativeParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Initiative ID or name')
});

export type GetInitiativeInput = z.infer<typeof getInitiativeParams>;

/**
 * Output schema - minimal essential fields
 *
 * @field id - Initiative UUID
 * @field name - Initiative name
 * @field description - Initiative description (optional, truncated to 500 chars)
 * @field targetDate - Target completion date (optional, ISO format)
 * @field createdAt - Creation timestamp (optional, ISO format)
 * @field updatedAt - Last update timestamp (optional, ISO format)
 * @field estimatedTokens - Estimated token count for the response
 */
export const getInitiativeOutput = z.object({
  // Required fields
  id: z.string(),
  name: z.string(),

  // Optional fields
  description: z.string().optional(),
  targetDate: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),

  estimatedTokens: z.number()
});

export type GetInitiativeOutput = z.infer<typeof getInitiativeOutput>;

/**
 * GraphQL response type
 */
interface InitiativeResponse {
  initiative: {
    id: string;
    name: string;
    description?: string | null;
    targetDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

/**
 * Get a Linear initiative by ID or name using GraphQL API
 *
 * Initiatives group projects for roadmap planning and provide high-level
 * strategic direction for the organization.
 *
 * @example
 * ```typescript
 * import { getInitiative } from './.claude/tools/linear';
 *
 * // Get by name
 * const initiative = await getInitiative.execute({
 *   id: 'Q2 2025 Product Roadmap'
 * });
 *
 * // Get by UUID
 * const initiative2 = await getInitiative.execute({
 *   id: 'abc123-uuid-456'
 * });
 *
 * console.log(initiative.name, initiative.description, initiative.targetDate);
 * ```
 */
export const getInitiative = {
  name: 'linear.get_initiative',
  description: 'Get detailed information about a specific Linear initiative',
  parameters: getInitiativeParams,

  async execute(
    input: GetInitiativeInput,
    testToken?: string
  ): Promise<GetInitiativeOutput> {
    // Validate input
    const validated = getInitiativeParams.parse(input);

    // Create client (with optional test token)
    const client = createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<InitiativeResponse>(
      client,
      GET_INITIATIVE_QUERY,
      { id: validated.id }
    );

    if (!response.initiative) {
      throw new Error(`Initiative not found: ${validated.id}`);
    }

    // Filter to essential fields with correct types
    const baseData = {
      id: response.initiative.id,
      name: response.initiative.name,
      description: response.initiative.description?.substring(0, 500), // Truncate for token efficiency
      targetDate: response.initiative.targetDate || undefined,
      createdAt: response.initiative.createdAt || undefined,
      updatedAt: response.initiative.updatedAt || undefined,
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return getInitiativeOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
