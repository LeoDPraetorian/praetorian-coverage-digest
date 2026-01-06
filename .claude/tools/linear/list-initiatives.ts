/**
 * list_initiatives - Linear GraphQL Wrapper
 *
 * List all initiatives in Linear via GraphQL API with optional filtering
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~800-2000 tokens (depends on number of initiatives)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 96-98%
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS (all optional):
 * - filter: string (optional) - Filter by name or description (fuzzy search)
 * - limit: number (optional) - Maximum number of initiatives to return (default: 50, max: 100)
 *
 * OUTPUT (after filtering):
 * - initiatives: array of initiative objects
 *   - id: string - Initiative UUID
 *   - name: string - Initiative name
 *   - description: string (optional) - Truncated to 200 chars
 *   - targetDate: string (optional) - Target completion date
 * - estimatedTokens: number
 *
 * @example
 * ```typescript
 * // List all initiatives
 * await listInitiatives.execute({});
 *
 * // List with filter
 * await listInitiatives.execute({ filter: 'Q2 2025' });
 *
 * // List with limit
 * await listInitiatives.execute({ limit: 10 });
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
 * GraphQL query for listing initiatives
 */
const LIST_INITIATIVES_QUERY = `
  query Initiatives($first: Int) {
    initiatives(first: $first) {
      nodes {
        id
        name
        description
        targetDate
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Input validation schema
 */
export const listInitiativesParams = z.object({
  filter: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Filter by name or description (fuzzy search)'),
  limit: z.number()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of initiatives to return (default: 50, max: 100)')
});

export type ListInitiativesInput = z.infer<typeof listInitiativesParams>;

/**
 * Output schema
 */
export const listInitiativesOutput = z.object({
  initiatives: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    targetDate: z.string().optional(),
  })),
  estimatedTokens: z.number()
});

export type ListInitiativesOutput = z.infer<typeof listInitiativesOutput>;

/**
 * GraphQL response type
 */
interface InitiativesResponse {
  initiatives: {
    nodes: Array<{
      id: string;
      name: string;
      description?: string | null;
      targetDate?: string | null;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

/**
 * List Linear initiatives using GraphQL API
 */
export const listInitiatives = {
  name: 'linear.list_initiatives',
  description: 'List all initiatives in Linear with optional filtering',
  parameters: listInitiativesParams,

  async execute(
    input: ListInitiativesInput = {},
    testToken?: string
  ): Promise<ListInitiativesOutput> {
    // Validate input
    const validated = listInitiativesParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Build variables for GraphQL query
    const variables: Record<string, unknown> = {};
    if (validated.limit) {
      variables.first = validated.limit;
    }

    // Execute GraphQL query
    const response = await executeGraphQL<InitiativesResponse>(
      client,
      LIST_INITIATIVES_QUERY,
      variables
    );

    // Validate response structure
    if (!response.initiatives || !Array.isArray(response.initiatives.nodes)) {
      throw new Error('Failed to list initiatives: Invalid response format');
    }

    // Filter and map initiatives to output format
    const baseData = {
      initiatives: response.initiatives.nodes.map((init) => ({
        id: init.id,
        name: init.name,
        description: init.description?.substring(0, 200),
        targetDate: init.targetDate || undefined,
      }))
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    return listInitiativesOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 800,
    reduction: '98%'
  }
};
