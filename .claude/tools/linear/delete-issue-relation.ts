/**
 * delete_issue_relation - Linear GraphQL Wrapper
 *
 * Delete a relation between issues in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (deletion response)
 * - vs MCP: Consistent behavior, no server dependency
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - relationId: string (required) - Relation UUID to delete
 *
 * OUTPUT:
 * - success: boolean - Whether deletion succeeded
 * - estimatedTokens: number
 *
 * @example
 * ```typescript
 * // Delete a relation
 * await deleteIssueRelation.execute({
 *   relationId: 'rel-123'
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
 * GraphQL mutation for deleting an issue relation
 */
const DELETE_ISSUE_RELATION_MUTATION = `
  mutation IssueRelationDelete($id: String!) {
    issueRelationDelete(id: $id) {
      success
    }
  }
`;

/**
 * Input validation schema
 */
export const deleteIssueRelationParams = z.object({
  relationId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Relation UUID to delete')
});

export type DeleteIssueRelationInput = z.infer<typeof deleteIssueRelationParams>;

/**
 * Output schema
 */
export const deleteIssueRelationOutput = z.object({
  success: z.boolean(),
  estimatedTokens: z.number()
});

export type DeleteIssueRelationOutput = z.infer<typeof deleteIssueRelationOutput>;

/**
 * GraphQL response type
 */
interface IssueRelationDeleteResponse {
  issueRelationDelete: {
    success: boolean;
  };
}

/**
 * Delete a relation between issues in Linear using GraphQL API
 */
export const deleteIssueRelation = {
  name: 'linear.delete_issue_relation',
  description: 'Delete a relation between issues in Linear',
  parameters: deleteIssueRelationParams,

  async execute(
    input: DeleteIssueRelationInput,
    testToken?: string
  ): Promise<DeleteIssueRelationOutput> {
    // Validate input
    const validated = deleteIssueRelationParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<IssueRelationDeleteResponse>(
      client,
      DELETE_ISSUE_RELATION_MUTATION,
      { id: validated.relationId }
    );

    // Check for success
    if (!response.issueRelationDelete.success) {
      throw new Error('Failed to delete issue relation');
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
    return deleteIssueRelationOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 200,
    reduction: '99%'
  }
};
