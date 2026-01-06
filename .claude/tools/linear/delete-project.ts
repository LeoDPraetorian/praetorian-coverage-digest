/**
 * delete_project - Linear GraphQL Wrapper
 *
 * Delete a project in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (deletion response)
 * - vs MCP: Consistent behavior, no server dependency
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - id: string (required) - Project UUID to delete
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether deletion succeeded
 *
 * Edge cases:
 * - GraphQL returns { success: true } on success
 * - Project must exist or error is thrown
 * - Deletion is permanent and cannot be undone
 *
 * @example
 * ```typescript
 * // Delete a project
 * await deleteProject.execute({ id: 'proj-uuid' });
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
 * GraphQL mutation for deleting a project
 */
const DELETE_PROJECT_MUTATION = `
  mutation ProjectDelete($id: String!) {
    projectDelete(id: $id) {
      success
    }
  }
`;

/**
 * Input validation schema
 * Maps to delete_project params
 */
export const deleteProjectParams = z.object({
  // Reference field - full validation
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Project UUID to delete'),
});

export type DeleteProjectInput = z.infer<typeof deleteProjectParams>;

/**
 * Output schema - minimal essential fields
 */
export const deleteProjectOutput = z.object({
  success: z.boolean(),
  estimatedTokens: z.number()
});

export type DeleteProjectOutput = z.infer<typeof deleteProjectOutput>;

/**
 * GraphQL response type
 */
interface ProjectDeleteResponse {
  projectDelete: {
    success: boolean;
  };
}

/**
 * Delete a project in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { deleteProject } from './.claude/tools/linear';
 *
 * // Delete a project
 * const result = await deleteProject.execute({ id: 'proj-uuid' });
 * console.log(result.success); // true
 * ```
 */
export const deleteProject = {
  name: 'linear.delete_project',
  description: 'Delete a project in Linear',
  parameters: deleteProjectParams,

  async execute(
    input: DeleteProjectInput,
    testToken?: string
  ): Promise<DeleteProjectOutput> {
    // Validate input
    const validated = deleteProjectParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<ProjectDeleteResponse>(
      client,
      DELETE_PROJECT_MUTATION,
      { id: validated.id }
    );

    // Check for success
    if (!response.projectDelete.success) {
      throw new Error('Failed to delete project');
    }

    // Filter to essential fields
    const baseData = {
      success: true
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return deleteProjectOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 200,
    reduction: '99%'
  }
};
