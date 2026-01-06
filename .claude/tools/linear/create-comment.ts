/**
 * create_comment - Linear GraphQL Wrapper
 *
 * Create a comment on a Linear issue via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (creation response)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - issueId: string (required) - Issue ID or identifier (e.g., CHARIOT-1234 or UUID)
 * - body: string (required) - Comment content in Markdown format
 * - parentId: string (optional) - Parent comment ID for threaded replies
 *
 * OUTPUT (after filtering):
 * - success: boolean - Always true on successful creation
 * - comment: object
 *   - id: string - Comment UUID
 *   - body: string - Comment content as provided
 *   - createdAt: string - ISO timestamp of creation
 *
 * Edge cases discovered:
 * - GraphQL returns {commentCreate: {success: true, comment: {...}}} on success
 * - On error, GraphQL returns errors array or throws
 * - Issue ID can be identifier (CHARIOT-1234) or UUID
 * - Parent ID enables threaded/nested comments
 * - Body supports full Markdown including code blocks
 *
 * @example
 * ```typescript
 * // Create simple comment
 * await createComment.execute({
 *   issueId: 'CHARIOT-1234',
 *   body: 'This is my comment'
 * });
 *
 * // Create reply to another comment
 * await createComment.execute({
 *   issueId: 'CHARIOT-1234',
 *   body: 'Replying to your point...',
 *   parentId: 'parent-comment-uuid'
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
 * GraphQL mutation for creating a comment
 */
const CREATE_COMMENT_MUTATION = `
  mutation CommentCreate($issueId: String!, $body: String!, $parentId: String) {
    commentCreate(input: { issueId: $issueId, body: $body, parentId: $parentId }) {
      success
      comment {
        id
        body
        createdAt
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to create_comment params
 */
export const createCommentParams = z.object({
  // Reference field - full validation
  issueId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID or identifier'),
  // User content - only block control chars, allow special chars for Markdown
  body: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Comment content (Markdown)'),
  // Reference field - full validation
  parentId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Parent comment ID (for replies)')
});

export type CreateCommentInput = z.infer<typeof createCommentParams>;

/**
 * Output schema - minimal essential fields
 */
export const createCommentOutput = z.object({
  success: z.boolean(),
  comment: z.object({
    id: z.string(),
    body: z.string(),
    createdAt: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateCommentOutput = z.infer<typeof createCommentOutput>;

/**
 * GraphQL response type
 */
interface CommentCreateResponse {
  commentCreate: {
    success: boolean;
    comment?: {
      id: string;
      body: string;
      createdAt: string;
    };
  };
}

/**
 * Create a comment on a Linear issue using GraphQL API
 *
 * @example
 * ```typescript
 * import { createComment } from './.claude/tools/linear';
 *
 * // Create simple comment
 * const result = await createComment.execute({
 *   issueId: 'abc123...',
 *   body: 'This is a comment'
 * });
 *
 * // Create reply to another comment
 * const result2 = await createComment.execute({
 *   issueId: 'abc123...',
 *   body: 'Reply to comment',
 *   parentId: 'parent-comment-id'
 * });
 * ```
 */
export const createComment = {
  name: 'linear.create_comment',
  description: 'Create a comment on a Linear issue',
  parameters: createCommentParams,

  async execute(
    input: CreateCommentInput,
    testToken?: string
  ): Promise<CreateCommentOutput> {
    // Validate input
    const validated = createCommentParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<CommentCreateResponse>(
      client,
      CREATE_COMMENT_MUTATION,
      {
        issueId: validated.issueId,
        body: validated.body,
        parentId: validated.parentId,
      }
    );

    if (!response.commentCreate?.success || !response.commentCreate?.comment) {
      throw new Error('Failed to create comment');
    }

    // Filter to essential fields
    const baseData = {
      success: response.commentCreate.success,
      comment: {
        id: response.commentCreate.comment.id,
        body: response.commentCreate.comment.body,
        createdAt: response.commentCreate.comment.createdAt
      }
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return createCommentOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
