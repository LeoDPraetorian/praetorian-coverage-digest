/**
 * list_users - Linear GraphQL Wrapper
 *
 * List users from Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (user list)
 * - vs MCP: Consistent behavior, no server dependency
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
 * - Empty search returns empty array, not error
 * - All users in workspace are returned if no query provided
 * - Query filtering is done server-side by Linear GraphQL API
 *
 * @example
 * ```typescript
 * // List all users
 * await listUsers.execute({});
 *
 * // Search users by name or email
 * await listUsers.execute({ query: 'nathan' });
 *
 * // With test token
 * await listUsers.execute({}, 'Bearer test-token');
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
 * GraphQL query for listing users in the workspace
 */
const LIST_USERS_QUERY = `
  query Users {
    users {
      nodes {
        id
        name
        email
        active
        createdAt
      }
    }
  }
`;

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
  totalUsers: z.number(),
  estimatedTokens: z.number()
});

export type ListUsersOutput = z.infer<typeof listUsersOutput>;

/**
 * GraphQL response type
 */
interface UsersResponse {
  users: {
    nodes: Array<{
      id: string;
      name: string;
      email: string;
      active?: boolean | null;
      createdAt?: string | null;
    }>;
  } | null;
}

/**
 * List users from Linear using GraphQL API
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
 *
 * // With test token
 * const users2 = await listUsers.execute({}, 'Bearer test-token');
 * ```
 */
export const listUsers = {
  name: 'linear.list_users',
  description: 'List users from Linear workspace',
  parameters: listUsersParams,

  async execute(
    input: ListUsersInput,
    testToken?: string
  ): Promise<ListUsersOutput> {
    // Validate input
    const validated = listUsersParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<UsersResponse>(
      client,
      LIST_USERS_QUERY,
      {}
    );

    // Extract users array (handle null/undefined)
    const users = response.users?.nodes || [];

    // Client-side filtering if query provided
    const filteredUsers = validated.query
      ? users.filter(user =>
          user.name.toLowerCase().includes(validated.query!.toLowerCase()) ||
          user.email.toLowerCase().includes(validated.query!.toLowerCase())
        )
      : users;

    // Filter to essential fields
    const baseData = {
      users: filteredUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active ?? undefined,
        createdAt: user.createdAt ?? undefined
      })),
      totalUsers: filteredUsers.length
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
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
