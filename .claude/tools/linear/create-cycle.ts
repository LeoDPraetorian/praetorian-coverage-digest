/**
 * create_cycle - Linear GraphQL Wrapper
 *
 * Create a new cycle in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (creation response)
 * - vs MCP: Consistent behavior, no server dependency
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - name: string (required) - Cycle name
 * - description: string (optional) - Cycle description
 * - team: string (required) - Team name or ID
 * - startsAt: string (optional) - Start date (ISO format)
 * - endsAt: string (optional) - End date (ISO format)
 *
 * OUTPUT (after filtering):
 * - success: boolean - Always true on successful creation
 * - cycle: object - Created cycle details
 *   - id: string - Linear internal UUID
 *   - name: string - Cycle name as provided
 *   - url: string - Linear URL for the cycle
 *
 * Edge cases:
 * - GraphQL returns {success: true, cycle: {...}} on success
 * - On error, GraphQL returns {errors: [...]} array
 * - Team must exist or error is thrown
 * - Date validation happens on the server side
 *
 * @example
 * ```typescript
 * // Create simple cycle
 * await createCycle.execute({ name: 'Sprint 1', team: 'Engineering' });
 *
 * // Create with full details
 * await createCycle.execute({
 *   name: 'Sprint 2',
 *   description: 'Q1 Sprint 2',
 *   team: 'Engineering',
 *   startsAt: '2025-01-15',
 *   endsAt: '2025-01-28'
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

/**
 * GraphQL mutation for creating a cycle
 */
const CREATE_CYCLE_MUTATION = `
  mutation CycleCreate($input: CycleCreateInput!) {
    cycleCreate(input: $input) {
      success
      cycle {
        id
        name
        url
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to CycleCreateInput params
 */
export const createCycleParams = z.object({
  // User content - control chars only
  name: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Cycle name'),
  // User content - control chars only
  description: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Cycle description'),
  // Reference field - full validation
  team: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Team name or ID'),
  // Date field - control chars only
  startsAt: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Start date (ISO format)'),
  // Date field - control chars only
  endsAt: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('End date (ISO format)'),
});

export type CreateCycleInput = z.infer<typeof createCycleParams>;

/**
 * Output schema - minimal essential fields
 */
export const createCycleOutput = z.object({
  success: z.boolean(),
  cycle: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateCycleOutput = z.infer<typeof createCycleOutput>;

/**
 * GraphQL response type
 */
interface CycleCreateResponse {
  cycleCreate: {
    success: boolean;
    cycle: {
      id: string;
      name: string;
      url: string;
    };
  };
}

/**
 * Create a new cycle in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { createCycle } from './.claude/tools/linear';
 *
 * // Create simple cycle
 * const result = await createCycle.execute({
 *   name: 'Sprint 1',
 *   team: 'Engineering'
 * });
 *
 * // Create with full details
 * const result2 = await createCycle.execute({
 *   name: 'Sprint 2',
 *   description: 'Q1 Sprint 2',
 *   team: 'Engineering',
 *   startsAt: '2025-01-15',
 *   endsAt: '2025-01-28'
 * });
 * ```
 */
export const createCycle = {
  name: 'linear.create_cycle',
  description: 'Create a new cycle in Linear',
  parameters: createCycleParams,

  async execute(
    input: CreateCycleInput,
    testToken?: string
  ): Promise<CreateCycleOutput> {
    // Validate input
    const validated = createCycleParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<CycleCreateResponse>(
      client,
      CREATE_CYCLE_MUTATION,
      { input: validated }
    );

    // Check for success
    if (!response.cycleCreate.success) {
      throw new Error('Failed to create cycle');
    }

    // Filter to essential fields
    const baseData = {
      success: true,
      cycle: {
        id: response.cycleCreate.cycle.id,
        name: response.cycleCreate.cycle.name,
        url: response.cycleCreate.cycle.url
      }
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return createCycleOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '99%'
  }
};
