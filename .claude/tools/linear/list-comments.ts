/**
 * list_comments - Linear GraphQL Wrapper
 *
 * List comments for a specific issue via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~700 tokens (comment list)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - issueId: string (required) - Issue ID or identifier (e.g., ENG-1234 or UUID)
 *
 * OUTPUT (after filtering):
 * - comments: array of comment objects
 *   - id: string - Comment UUID
 *   - body: string - Comment content (truncated to 300 chars for efficiency)
 *   - user: object (optional) - Comment author info
 *     - id: string - User UUID
 *     - name: string - Display name
 *     - email: string - User email
 *   - createdAt: string - ISO timestamp
 *   - updatedAt: string - ISO timestamp
 * - totalComments: number - Count of comments returned
 *
 * Edge cases discovered:
 * - Body is truncated to 300 chars to reduce token usage
 * - User object may be undefined if author information unavailable
 * - Issue ID can be identifier (ENG-1234) or UUID
 * - Empty comments returns empty array, not null
 *
 * @example
 * ```typescript
 * // List all comments for an issue
 * const result = await listComments.execute({
 *   issueId: 'ENG-1234'
 * });
 * console.log(`Found ${result.totalComments} comments`);
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
 * GraphQL query for listing comments on an issue
 */
const LIST_COMMENTS_QUERY = `
  query IssueComments($id: String!) {
    issue(id: $id) {
      id
      comments {
        nodes {
          id
          body
          user {
            id
            name
            email
          }
          createdAt
          updatedAt
        }
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to list_comments params
 */
export const listCommentsParams = z.object({
  // Reference field - full validation
  issueId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID or identifier')
});

export type ListCommentsInput = z.infer<typeof listCommentsParams>;

/**
 * Output schema - minimal essential fields
 */
export const listCommentsOutput = z.object({
  comments: z.array(z.object({
    id: z.string(),
    body: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string()
    }).optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  totalComments: z.number(),
  estimatedTokens: z.number()
});

export type ListCommentsOutput = z.infer<typeof listCommentsOutput>;

/**
 * GraphQL response type
 */
interface IssueCommentsResponse {
  issue: {
    id: string;
    comments?: {
      nodes: Array<{
        id: string;
        body?: string | null;
        user?: {
          id: string;
          name: string;
          email: string;
        } | null;
        createdAt?: string;
        updatedAt?: string;
      }>;
    } | null;
  } | null;
}

/**
 * List comments for a Linear issue using GraphQL API
 *
 * @example
 * ```typescript
 * import { listComments } from './.claude/tools/linear';
 *
 * // List comments for an issue
 * const comments = await listComments.execute({ issueId: 'ENG-1234' });
 *
 * // With test token
 * const comments2 = await listComments.execute({ issueId: 'abc123...' }, 'test-token');
 * ```
 */
export const listComments = {
  name: 'linear.list_comments',
  description: 'List comments for a specific Linear issue',
  parameters: listCommentsParams,

  async execute(
    input: ListCommentsInput,
    testToken?: string
  ): Promise<ListCommentsOutput> {
    // Validate input
    const validated = listCommentsParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<IssueCommentsResponse>(
      client,
      LIST_COMMENTS_QUERY,
      { id: validated.issueId }
    );

    if (!response.issue) {
      throw new Error(`Issue not found: ${validated.issueId}`);
    }

    // Extract comments array (handle null/undefined)
    const comments = response.issue.comments?.nodes || [];

    // Filter to essential fields
    const baseData = {
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body?.substring(0, 300) || '', // Truncate for token efficiency
        user: comment.user ? {
          id: comment.user.id,
          name: comment.user.name,
          email: comment.user.email
        } : undefined,
        createdAt: comment.createdAt || '',
        updatedAt: comment.updatedAt || ''
      })),
      totalComments: comments.length
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return listCommentsOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 700,
    reduction: '99%'
  }
};
