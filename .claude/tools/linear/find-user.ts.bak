/**
 * find_user - Linear MCP Wrapper
 *
 * Find a specific user in Linear workspace via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (single user)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - query: string (required) - User ID, email, or name to search
 *
 * OUTPUT (after filtering):
 * - id: string - User UUID
 * - name: string - User display name
 * - email: string - User email address
 * - displayName: string (optional) - User display name
 * - avatarUrl: string (optional) - Profile picture URL
 * - active: boolean (optional) - Whether user is active
 * - admin: boolean (optional) - Whether user is admin
 * - createdAt: string (optional) - ISO timestamp
 *
 * Edge cases discovered:
 * - MCP list_users with query returns array, we take first match
 * - Empty query returns all users, not an error
 * - Query matches against name and email
 *
 * @example
 * ```typescript
 * // Find user by email
 * await findUser.execute({ query: 'john@example.com' });
 *
 * // Find user by name
 * await findUser.execute({ query: 'John Doe' });
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
 * Maps to list_users params with query
 */
export const findUserParams = z.object({
  // Search query - full validation
  query: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('User ID, email, or name to search'),
});

export type FindUserInput = z.infer<typeof findUserParams>;

/**
 * Output schema - minimal essential fields
 */
export const findUserOutput = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
  active: z.boolean().optional(),
  admin: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export type FindUserOutput = z.infer<typeof findUserOutput>;

/**
 * Find a user in Linear using MCP wrapper
 *
 * @example
 * ```typescript
 * import { findUser } from './.claude/tools/linear';
 *
 * // Find by email
 * const user = await findUser.execute({ query: 'john@example.com' });
 * ```
 */
export const findUser = {
  name: 'linear.find_user',
  description: 'Find a specific user in Linear workspace',
  parameters: findUserParams,

  async execute(input: FindUserInput): Promise<FindUserOutput> {
    // Validate input
    const validated = findUserParams.parse(input);

    // Call MCP tool (uses list_users with query to find)
    const rawData = await callMCPTool(
      'linear',
      'list_users',
      { query: validated.query, limit: 1 }
    );

    // Linear MCP returns array from list_users
    const users = Array.isArray(rawData) ? rawData : (rawData?.users || []);

    if (users.length === 0) {
      throw new Error(`User not found: ${validated.query}`);
    }

    const user = users[0];

    // Filter to essential fields
    const filtered = {
      id: user.id,
      name: user.name,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      active: user.active,
      admin: user.admin,
      createdAt: user.createdAt,
    };

    // Validate output
    return findUserOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '99%'
  }
};
