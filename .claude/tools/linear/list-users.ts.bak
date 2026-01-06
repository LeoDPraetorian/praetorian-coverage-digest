/**
 * list_users - Linear MCP Wrapper
 *
 * List users from Linear workspace via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (user list)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - query: string (optional) - Filter by name or email
 *
 * OUTPUT (after filtering):
 * - users: array of user objects
 *   - id: string - User UUID
 *   - name: string - User display name
 *   - email: string - User email address
 *   - active: boolean (optional) - Whether user is active
 *   - createdAt: string (optional) - ISO timestamp
 * - totalUsers: number - Count of returned users
 *
 * Edge cases discovered:
 * - MCP returns array directly, not wrapped in { users: [...] }
 * - Empty search returns empty array, not error
 * - All users in workspace are returned if no query provided
 *
 * @example
 * ```typescript
 * // List all users
 * await listUsers.execute({});
 *
 * // Search users by name or email
 * await listUsers.execute({ query: 'nathan' });
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
 * Maps to list_users params
 */
export const listUsersParams = z.object({
  // Search query - full validation
  query: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Filter by name or email')
});

export type ListUsersInput = z.infer<typeof listUsersParams>;

/**
 * Output schema - minimal essential fields
 */
export const listUsersOutput = z.object({
  users: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    active: z.boolean().optional(),
    createdAt: z.string().optional()
  })),
  totalUsers: z.number()
});

export type ListUsersOutput = z.infer<typeof listUsersOutput>;

/**
 * List users from Linear using MCP wrapper
 *
 * @example
 * ```typescript
 * import { listUsers } from './.claude/tools/linear';
 *
 * // List all users
 * const users = await listUsers.execute({});
 *
 * // Search users
 * const searchResults = await listUsers.execute({ query: 'nathan' });
 * ```
 */
export const listUsers = {
  name: 'linear.list_users',
  description: 'List users from Linear workspace',
  parameters: listUsersParams,

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    // Validate input
    const validated = listUsersParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'list_users',
      validated
    );

    // Linear MCP returns array directly, not { users: [...] }
    const users = Array.isArray(rawData) ? rawData : (rawData.users || []);

    // Filter to essential fields
    const filtered = {
      users: users.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        createdAt: user.createdAt
      })),
      totalUsers: users.length
    };

    // Validate output
    return listUsersOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
