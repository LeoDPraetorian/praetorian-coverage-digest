/**
 * list_issue_relations - Linear GraphQL Wrapper
 *
 * List all relations for an issue in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (relations list response)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - issueId: string (required) - Issue identifier (e.g., "ISSUE-123" or UUID)
 *
 * OUTPUT (after filtering):
 * - relations: array - List of relations
 *   - id: string - Relation UUID
 *   - type: string - Relation type (blocks, blocked_by, duplicate, related)
 *   - relatedIssue: object - Related issue details
 *     - id: string - Issue UUID
 *     - identifier: string - Human-readable ID
 *     - title: string - Issue title
 *
 * Edge cases discovered:
 * - GraphQL returns nested structure: { issue: { relations: { nodes: [...] } } }
 * - Empty array if no relations exist
 * - Issue identifier can be either human-readable (ISSUE-123) or UUID
 * - Each relation includes both issue and relatedIssue, but we only return relatedIssue
 *
 * @example
 * ```typescript
 * // List all relations for an issue
 * const result = await listIssueRelations.execute({
 *   issueId: 'ISSUE-123'
 * });
 *
 * result.relations.forEach(relation => {
 *   console.log(`${relation.type}: ${relation.relatedIssue.identifier}`);
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
 * GraphQL query for listing issue relations
 */
const LIST_ISSUE_RELATIONS_QUERY = `
  query IssueRelations($issueId: String!) {
    issue(id: $issueId) {
      relations {
        nodes {
          id
          type
          relatedIssue {
            id
            identifier
            title
          }
        }
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to list_issue_relations params
 */
export const listIssueRelationsParams = z.object({
  // Reference field - full validation
  issueId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue identifier (e.g., "ISSUE-123" or UUID)')
});

export type ListIssueRelationsInput = z.infer<typeof listIssueRelationsParams>;

/**
 * Output schema - minimal essential fields
 */
export const listIssueRelationsOutput = z.object({
  relations: z.array(z.object({
    id: z.string(),
    type: z.string(),
    relatedIssue: z.object({
      id: z.string(),
      identifier: z.string(),
      title: z.string()
    })
  })),
  estimatedTokens: z.number()
});

export type ListIssueRelationsOutput = z.infer<typeof listIssueRelationsOutput>;

/**
 * GraphQL response type
 */
interface IssueRelationsResponse {
  issue: {
    relations: {
      nodes: Array<{
        id: string;
        type: string;
        relatedIssue: {
          id: string;
          identifier: string;
          title: string;
        };
      }>;
    };
  };
}

/**
 * List all relations for an issue in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { listIssueRelations } from './.claude/tools/linear';
 *
 * // List all relations
 * const result = await listIssueRelations.execute({
 *   issueId: 'ISSUE-123'
 * });
 *
 * // Process relations by type
 * const blocking = result.relations.filter(r => r.type === 'blocks');
 * const blockedBy = result.relations.filter(r => r.type === 'blocked_by');
 * ```
 */
export const listIssueRelations = {
  name: 'linear.list_issue_relations',
  description: 'List all relations for an issue in Linear',
  parameters: listIssueRelationsParams,

  async execute(
    input: ListIssueRelationsInput,
    testToken?: string
  ): Promise<ListIssueRelationsOutput> {
    // Validate input
    const validated = listIssueRelationsParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Build variables for GraphQL query
    const variables = {
      issueId: validated.issueId
    };

    // Execute GraphQL query
    const response = await executeGraphQL<IssueRelationsResponse>(
      client,
      LIST_ISSUE_RELATIONS_QUERY,
      variables
    );

    // Validate response structure
    if (!response.issue?.relations?.nodes) {
      throw new Error('Failed to list issue relations: Invalid response format');
    }

    // Filter to essential fields
    const baseData = {
      relations: response.issue.relations.nodes.map((relation) => ({
        id: relation.id,
        type: relation.type,
        relatedIssue: {
          id: relation.relatedIssue.id,
          identifier: relation.relatedIssue.identifier,
          title: relation.relatedIssue.title
        }
      }))
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return listIssueRelationsOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '99%'
  }
};
