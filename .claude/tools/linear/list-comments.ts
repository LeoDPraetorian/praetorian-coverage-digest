/**
 * list_comments - Linear MCP Wrapper
 *
 * List comments for a specific issue via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~700 tokens (comment list)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - issueId: string (required) - Issue ID or identifier (e.g., CHARIOT-1234 or UUID)
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
 * - MCP may return array directly or wrapped in { comments: [...] }
 * - Body is truncated to 300 chars to reduce token usage
 * - User object may be undefined if author information unavailable
 * - Issue ID can be identifier (CHARIOT-1234) or UUID
 *
 * @example
 * ```typescript
 * // List all comments for an issue
 * const result = await listComments.execute({
 *   issueId: 'CHARIOT-1234'
 * });
 * console.log(`Found ${result.totalComments} comments`);
 * ```
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

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
  totalComments: z.number()
});

export type ListCommentsOutput = z.infer<typeof listCommentsOutput>;

/**
 * List comments for a Linear issue using MCP wrapper
 *
 * @example
 * ```typescript
 * import { listComments } from './.claude/tools/linear';
 *
 * // List comments for an issue
 * const comments = await listComments.execute({ issueId: 'abc123...' });
 * ```
 */
export const listComments = {
  name: 'linear.list_comments',
  description: 'List comments for a specific Linear issue',
  parameters: listCommentsParams,

  async execute(input: ListCommentsInput): Promise<ListCommentsOutput> {
    // Validate input
    const validated = listCommentsParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'list_comments',
      validated
    );

    // Linear MCP returns array directly, not { comments: [...] }
    const comments = Array.isArray(rawData) ? rawData : (rawData.comments || []);

    // Filter to essential fields
    const filtered = {
      comments: comments.map((comment: any) => ({
        id: comment.id,
        body: comment.body?.substring(0, 300), // Truncate for token efficiency
        user: comment.user ? {
          id: comment.user.id,
          name: comment.user.name,
          email: comment.user.email
        } : undefined,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt
      })),
      totalComments: comments.length
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
