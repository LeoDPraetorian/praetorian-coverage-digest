/**
 * update_initiative - Linear GraphQL Wrapper
 *
 * Update an existing initiative in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (update response)
 * - vs MCP: Consistent behavior, no server dependency
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - id: string (required) - Initiative UUID or name
 * - name: string (optional) - New initiative name
 * - description: string (optional) - New initiative description
 * - targetDate: string (optional) - New target completion date
 *
 * OUTPUT (after filtering):
 * - success: boolean - Always true on successful update
 * - initiative: object
 *   - id: string - Linear internal UUID
 *   - name: string - Initiative name
 *
 * Edge cases:
 * - GraphQL returns {success: true, initiative: {...}} on success
 * - On error, GraphQL returns {errors: [...]} array
 * - ID is required, all other fields are optional
 *
 * @example
 * ```typescript
 * // Update initiative name
 * await updateInitiative.execute({
 *   id: 'abc-123',
 *   name: 'Updated Name'
 * });
 *
 * // Update multiple fields
 * await updateInitiative.execute({
 *   id: 'Q2 2025 Roadmap',
 *   description: 'Updated description',
 *   targetDate: '2025-07-31'
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

/**
 * GraphQL mutation for updating an initiative
 */
const UPDATE_INITIATIVE_MUTATION = `
  mutation InitiativeUpdate($id: String!, $input: InitiativeUpdateInput!) {
    initiativeUpdate(id: $id, input: $input) {
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
 * Maps to InitiativeUpdate params
 *
 * @field id - Initiative ID or name (required) - blocks control characters and injection
 * @field name - New initiative name (optional) - blocks control characters
 * @field description - New initiative description in Markdown (optional) - allows newlines/tabs, blocks dangerous control chars
 * @field targetDate - New target completion date in ISO format (optional) - blocks control characters
 */
export const updateInitiativeParams = z.object({
  // ID is identifier - strict validation
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Initiative ID or name'),
  // Name is user content - only block control chars
  name: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('New initiative name'),
  // Description is user content - allow whitespace, block control chars
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('New initiative description (Markdown)'),
  // Date field - block control chars
  targetDate: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('New target date (ISO format)')
});

export type UpdateInitiativeInput = z.infer<typeof updateInitiativeParams>;

/**
 * Output schema - minimal essential fields
 *
 * @field success - Whether the initiative was updated successfully
 * @field initiative - Updated initiative details (id and name)
 * @field estimatedTokens - Estimated token count for the response
 */
export const updateInitiativeOutput = z.object({
  success: z.boolean(),
  initiative: z.object({
    id: z.string(),
    name: z.string(),
  }),
  estimatedTokens: z.number()
});

export type UpdateInitiativeOutput = z.infer<typeof updateInitiativeOutput>;

/**
 * GraphQL response type
 */
interface InitiativeUpdateResponse {
  initiativeUpdate: {
    success: boolean;
    initiative: {
      id: string;
      name: string;
    };
  };
}

/**
 * Update an existing initiative in Linear using GraphQL API
 *
 * Initiatives group projects for roadmap planning and provide high-level
 * strategic direction for the organization.
 *
 * @example
 * ```typescript
 * import { updateInitiative } from './.claude/tools/linear';
 *
 * // Update initiative name
 * const result = await updateInitiative.execute({
 *   id: 'abc-123',
 *   name: 'Updated Name'
 * });
 *
 * // Update multiple fields
 * const result2 = await updateInitiative.execute({
 *   id: 'Q2 2025 Roadmap',
 *   description: 'Updated description',
 *   targetDate: '2025-07-31'
 * });
 *
 * console.log(result.initiative.id);
 * ```
 */
export const updateInitiative = {
  name: 'linear.update_initiative',
  description: 'Update an existing initiative in Linear',
  parameters: updateInitiativeParams,

  async execute(
    input: UpdateInitiativeInput,
    testToken?: string
  ): Promise<UpdateInitiativeOutput> {
    // Validate input
    const validated = updateInitiativeParams.parse(input);

    // Extract id and build update input
    const { id, ...updateInput } = validated;

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<InitiativeUpdateResponse>(
      client,
      UPDATE_INITIATIVE_MUTATION,
      { id, input: updateInput }
    );

    // Check for success
    if (!response.initiativeUpdate.success) {
      throw new Error('Failed to update initiative');
    }

    // Filter to essential fields
    const baseData = {
      success: true,
      initiative: {
        id: response.initiativeUpdate.initiative.id,
        name: response.initiativeUpdate.initiative.name,
      }
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return updateInitiativeOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
