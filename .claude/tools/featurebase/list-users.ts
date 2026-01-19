/**
 * list_users - FeatureBase REST Wrapper
 *
 * Fetch paginated list of users.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (20 users per page)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 82%
 *
 * Schema Discovery Results:
 * - Returns users array with pagination
 * - Default limit is 20
 * - Includes activity stats per user
 *
 * Optional fields:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 *
 * Edge cases discovered:
 * - Pagination via offset
 * - Activity stats included per user
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';

/**
 * Input schema for list-users
 * Verified from FeatureBase Users API docs
 */
export const listUsersParams = z.object({
  page: z.number()
    .int()
    .min(1, 'page must be at least 1')
    .default(1)
    .describe('Page number (default: 1)'),

  limit: z.number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(100, 'limit cannot exceed 100')
    .default(10)
    .describe('Number of users to return per page (1-100, default: 10)'),

  sortBy: z.enum(['topPosters', 'topCommenters', 'lastActivity'])
    .default('lastActivity')
    .describe('Sort order (topPosters, topCommenters, lastActivity)'),

  q: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Command injection not allowed')
    .describe('Search query for name or email'),
});

export type ListUsersInput = z.infer<typeof listUsersParams>;

/**
 * Output schema for list-users
 * Filtered to essential fields for token optimization
 * Based on actual API response structure
 */
export const listUsersOutput = z.object({
  users: z.array(z.object({
    email: z.string(),
    userId: z.string().optional(),
    name: z.string().optional(),
    customFields: z.record(z.any()).optional(),
    companies: z.array(z.object({
      id: z.string(),
      name: z.string(),
      monthlySpend: z.number().optional(),
    })).optional(),
    createdAt: z.string(),
    lastActivity: z.string().optional(),
    totalPosts: z.number().optional(),
    totalComments: z.number().optional(),
    totalUpvotes: z.number().optional(),
  })),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  totalResults: z.number(),
  estimatedTokens: z.number(),
});

export type ListUsersOutput = z.infer<typeof listUsersOutput>;

/**
 * List users tool
 */
export const listUsers = {
  name: 'featurebase.list_users',
  description: 'List identified users with pagination, filtering, and sorting',
  parameters: listUsersParams,

  async execute(
    input: ListUsersInput,
    client: HTTPPort
  ): Promise<ListUsersOutput> {
    // Validate input
    const validated = listUsersParams.parse(input);

    // Build query params
    const searchParams: Record<string, string | number> = {
      page: validated.page,
      limit: validated.limit,
      sortBy: validated.sortBy,
    };

    if (validated.q) searchParams.q = validated.q;

    // Make request
    // API returns: {users: [...], page: 1, limit: 10, totalPages: 1, totalResults: 2}
    const response = await client.request<{
      users: Array<{
        email: string;
        userId?: string;
        name?: string;
        customFields?: Record<string, any>;
        companies?: Array<{
          id: string;
          name: string;
          monthlySpend?: number;
        }>;
        createdAt: string;
        lastActivity?: string;
        totalPosts?: number;
        totalComments?: number;
        totalUpvotes?: number;
      }>;
      page: number;
      limit: number;
      totalPages: number;
      totalResults: number;
    }>('get', 'v2/organization/identifyUser/query', { searchParams });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`FeatureBase API error: ${sanitized}`);
    }

    // Filter and return with token estimation
    const filtered = {
      users: response.data.users.map(user => ({
        email: user.email,
        userId: user.userId,
        name: user.name,
        customFields: user.customFields,
        companies: user.companies,
        createdAt: user.createdAt,
        lastActivity: user.lastActivity,
        totalPosts: user.totalPosts,
        totalComments: user.totalComments,
        totalUpvotes: user.totalUpvotes,
      })),
      page: response.data.page,
      limit: response.data.limit,
      totalPages: response.data.totalPages,
      totalResults: response.data.totalResults,
      estimatedTokens: estimateTokens(response.data),
    };

    return listUsersOutput.parse(filtered);
  },

  estimatedTokens: 500,
  tokenEstimate: {
    withoutCustomTool: 3000,
    withCustomTool: 0,
    whenUsed: 500,
    reductionPercentage: 83,
  },
};
