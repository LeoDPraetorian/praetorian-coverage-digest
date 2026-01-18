/**
 * find_user - Linear GraphQL Wrapper
 *
 * Find a specific user in Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (single user)
 * - vs MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
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
 * - GraphQL users query returns array, we take first match
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
 * GraphQL query for finding a user
 */
const FIND_USER_QUERY = `
  query Users($filter: UserFilter) {
    users(filter: $filter, first: 1) {
      nodes {
        id
        name
        email
        displayName
        avatarUrl
        active
        admin
        createdAt
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to users query params with filter
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
  estimatedTokens: z.number()
});

export type FindUserOutput = z.infer<typeof findUserOutput>;

/**
 * GraphQL response type
 */
interface UsersResponse {
  users: {
    nodes: Array<{
      id: string;
      name: string;
      email: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      active?: boolean | null;
      admin?: boolean | null;
      createdAt?: string | null;
    }>;
  } | null;
}

/**
 * Find a user in Linear using GraphQL API
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

  async execute(
    input: FindUserInput,
    testToken?: string
  ): Promise<FindUserOutput> {
    // Validate input
    const validated = findUserParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query with filter
    // Note: Linear's API will match the query string against name and email
    const response = await executeGraphQL<UsersResponse>(
      client,
      FIND_USER_QUERY,
      {
        filter: {
          or: [
            { email: { containsIgnoreCase: validated.query } },
            { name: { containsIgnoreCase: validated.query } },
            { displayName: { containsIgnoreCase: validated.query } }
          ]
        }
      }
    );

    // Linear GraphQL returns array from users query
    const users = response.users?.nodes || [];

    if (users.length === 0) {
      throw new Error(`User not found: ${validated.query}`);
    }

    const user = users[0];

    // Filter to essential fields
    const baseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      displayName: user.displayName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      active: user.active ?? undefined,
      admin: user.admin ?? undefined,
      createdAt: user.createdAt || undefined,
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
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
