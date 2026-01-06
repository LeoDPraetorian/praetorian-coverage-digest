/**
 * create_issue_relation - Linear GraphQL Wrapper
 *
 * Create a relation between two issues in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (relation response)
 * - vs MCP: Consistent behavior, no server dependency
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - issueId: string (required) - Issue identifier (e.g., "ISSUE-123" or UUID)
 * - relatedIssueId: string (required) - Related issue identifier
 * - type: string (required) - Relation type: "blocks", "blocked_by", "duplicate", "related"
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether creation succeeded
 * - relation: object - Created relation details
 *   - id: string - Relation UUID
 *   - type: string - Relation type
 *   - issueId: string - Source issue ID
 *   - relatedIssueId: string - Target issue ID
 *
 * Edge cases discovered:
 * - GraphQL returns { success: true, issueRelation: {...} } on success
 * - Issue identifiers can be either human-readable (ISSUE-123) or UUID
 * - Relation type must be one of the four valid types
 * - Creating duplicate relation may fail if it already exists
 *
 * @example
 * ```typescript
 * // Create blocking relation
 * await createIssueRelation.execute({
 *   issueId: 'ISSUE-123',
 *   relatedIssueId: 'ISSUE-456',
 *   type: 'blocks'
 * });
 *
 * // Create duplicate relation
 * await createIssueRelation.execute({
 *   issueId: 'ISSUE-123',
 *   relatedIssueId: 'ISSUE-789',
 *   type: 'duplicate'
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
 * GraphQL mutation for creating an issue relation
 */
const CREATE_ISSUE_RELATION_MUTATION = `
  mutation IssueRelationCreate($input: IssueRelationCreateInput!) {
    issueRelationCreate(input: $input) {
      success
      issueRelation {
        id
        type
        issue { id }
        relatedIssue { id }
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to IssueRelationCreateInput params
 */
export const createIssueRelationParams = z.object({
  // Reference field - full validation
  issueId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue identifier (e.g., "ISSUE-123" or UUID)'),
  // Reference field - full validation
  relatedIssueId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Related issue identifier'),
  // Enum field - restrict to valid relation types
  type: z.enum(['blocks', 'blocked_by', 'duplicate', 'related'])
    .describe('Relation type: blocks, blocked_by, duplicate, or related')
});

export type CreateIssueRelationInput = z.infer<typeof createIssueRelationParams>;

/**
 * Output schema - minimal essential fields
 */
export const createIssueRelationOutput = z.object({
  success: z.boolean(),
  relation: z.object({
    id: z.string(),
    type: z.string(),
    issueId: z.string(),
    relatedIssueId: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateIssueRelationOutput = z.infer<typeof createIssueRelationOutput>;

/**
 * GraphQL response type
 */
interface IssueRelationCreateResponse {
  issueRelationCreate: {
    success: boolean;
    issueRelation?: {
      id: string;
      type: string;
      issue: { id: string };
      relatedIssue: { id: string };
    };
  };
}

/**
 * Create a relation between two issues in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { createIssueRelation } from './.claude/tools/linear';
 *
 * // Create blocking relation
 * const result = await createIssueRelation.execute({
 *   issueId: 'ISSUE-123',
 *   relatedIssueId: 'ISSUE-456',
 *   type: 'blocks'
 * });
 *
 * // Create duplicate relation
 * const result2 = await createIssueRelation.execute({
 *   issueId: 'ISSUE-123',
 *   relatedIssueId: 'ISSUE-789',
 *   type: 'duplicate'
 * });
 * ```
 */
export const createIssueRelation = {
  name: 'linear.create_issue_relation',
  description: 'Create a relation between two issues in Linear',
  parameters: createIssueRelationParams,

  async execute(
    input: CreateIssueRelationInput,
    testToken?: string
  ): Promise<CreateIssueRelationOutput> {
    // Validate input
    const validated = createIssueRelationParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<IssueRelationCreateResponse>(
      client,
      CREATE_ISSUE_RELATION_MUTATION,
      { input: validated }
    );

    // Check for success
    if (!response.issueRelationCreate.success) {
      throw new Error('Failed to create issue relation');
    }

    if (!response.issueRelationCreate.issueRelation) {
      throw new Error('Failed to create issue relation: No relation returned');
    }

    // Filter to essential fields
    const baseData = {
      success: response.issueRelationCreate.success,
      relation: {
        id: response.issueRelationCreate.issueRelation.id,
        type: response.issueRelationCreate.issueRelation.type,
        issueId: response.issueRelationCreate.issueRelation.issue.id,
        relatedIssueId: response.issueRelationCreate.issueRelation.relatedIssue.id
      }
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return createIssueRelationOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '99%'
  }
};
