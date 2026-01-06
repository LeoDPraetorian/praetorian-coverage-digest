/**
 * create_initiative - Linear GraphQL Wrapper
 *
 * Create a new initiative in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (creation response)
 * - vs MCP: Consistent behavior, no server dependency
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - name: string (required) - Initiative name
 * - description: string (optional) - Initiative description in Markdown
 * - targetDate: string (optional) - Target completion date in ISO format
 *
 * OUTPUT (after filtering):
 * - success: boolean - Always true on successful creation
 * - initiative: object
 *   - id: string - Linear internal UUID
 *   - name: string - Initiative name as provided
 *
 * Edge cases:
 * - GraphQL returns {success: true, initiative: {...}} on success
 * - On error, GraphQL returns {errors: [...]} array
 * - Name is required, description and targetDate are optional
 *
 * @example
 * ```typescript
 * // Create simple initiative
 * await createInitiative.execute({
 *   name: 'Q2 2025 Product Roadmap'
 * });
 *
 * // Create with full details
 * await createInitiative.execute({
 *   name: 'Annual Platform Modernization',
 *   description: '## Goals\n- Modernize infrastructure\n- Improve performance',
 *   targetDate: '2025-12-31'
 * });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoControlCharsAllowWhitespace,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * GraphQL mutation for creating an initiative
 */
const CREATE_INITIATIVE_MUTATION = `
  mutation InitiativeCreate($input: InitiativeCreateInput!) {
    initiativeCreate(input: $input) {
      success
      initiative {
        id
        name
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to InitiativeCreateInput params
 *
 * @field name - Initiative name (required) - blocks control characters
 * @field description - Initiative description in Markdown (optional) - allows newlines/tabs, blocks dangerous control chars
 * @field targetDate - Target completion date in ISO format (optional) - blocks control characters
 */
export const createInitiativeParams = z.object({
  // Name is user content - only block control chars
  name: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Initiative name'),
  // Description is user content - allow whitespace, block control chars
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('Initiative description (Markdown)'),
  // Date field - block control chars
  targetDate: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Target date (ISO format)'),
});

export type CreateInitiativeInput = z.infer<typeof createInitiativeParams>;

/**
 * Output schema - minimal essential fields
 *
 * @field success - Whether the initiative was created successfully
 * @field initiative - Created initiative details (id and name)
 * @field estimatedTokens - Estimated token count for the response
 */
export const createInitiativeOutput = z.object({
  success: z.boolean(),
  initiative: z.object({
    id: z.string(),
    name: z.string(),
  }),
  estimatedTokens: z.number()
});

export type CreateInitiativeOutput = z.infer<typeof createInitiativeOutput>;

/**
 * GraphQL response type
 */
interface InitiativeCreateResponse {
  initiativeCreate: {
    success: boolean;
    initiative: {
      id: string;
      name: string;
    };
  };
}

/**
 * Create a new initiative in Linear using GraphQL API
 *
 * Initiatives group projects for roadmap planning and provide high-level
 * strategic direction for the organization.
 *
 * @example
 * ```typescript
 * import { createInitiative } from './.claude/tools/linear';
 *
 * // Create simple initiative
 * const result = await createInitiative.execute({
 *   name: 'Q2 2025 Product Roadmap'
 * });
 *
 * // Create with full details
 * const result2 = await createInitiative.execute({
 *   name: 'Annual Platform Modernization',
 *   description: 'Complete overhaul of platform infrastructure',
 *   targetDate: '2025-12-31'
 * });
 *
 * console.log(result.initiative.id);
 * ```
 */
export const createInitiative = {
  name: 'linear.create_initiative',
  description: 'Create a new initiative in Linear',
  parameters: createInitiativeParams,

  async execute(
    input: CreateInitiativeInput,
    testToken?: string
  ): Promise<CreateInitiativeOutput> {
    // Validate input
    const validated = createInitiativeParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<InitiativeCreateResponse>(
      client,
      CREATE_INITIATIVE_MUTATION,
      { input: validated }
    );

    // Check for success
    if (!response.initiativeCreate.success) {
      throw new Error('Failed to create initiative');
    }

    // Filter to essential fields
    const baseData = {
      success: true,
      initiative: {
        id: response.initiativeCreate.initiative.id,
        name: response.initiativeCreate.initiative.name,
      }
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return createInitiativeOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
