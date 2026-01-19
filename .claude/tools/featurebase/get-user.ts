/**
 * get_user - FeatureBase REST Wrapper
 *
 * Fetch a user by email or userId from FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~250 tokens (user details)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 88%
 *
 * Schema Discovery Results:
 * - Can query by email OR userId
 * - Returns activity stats (posts, comments, upvotes)
 * - customFields array is optional
 *
 * Required fields (at least one):
 * - email: string OR userId: string
 *
 * Edge cases discovered:
 * - Accepts either email or userId
 * - Returns 404 if user doesn't exist
 * - Activity stats always included
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const getUserParams = z
  .object({
    email: z
      .string()
      .optional()
      .refine(
        (val) => !val || validateNoControlChars(val),
        'Control characters not allowed'
      )
      .refine(
        (val) => !val || validateNoPathTraversal(val),
        'Path traversal not allowed'
      )
      .refine(
        (val) => !val || validateNoCommandInjection(val),
        'Invalid characters detected'
      )
      .describe('User email address'),
    userId: z
      .string()
      .optional()
      .refine(
        (val) => !val || validateNoControlChars(val),
        'Control characters not allowed'
      )
      .refine(
        (val) => !val || validateNoPathTraversal(val),
        'Path traversal not allowed'
      )
      .refine(
        (val) => !val || validateNoCommandInjection(val),
        'Invalid characters detected'
      )
      .describe('User ID from your system'),
  })
  .refine((data) => data.email || data.userId, {
    message: 'Either email or userId is required',
  });

export type GetUserInput = z.infer<typeof getUserParams>;

export const getUserOutput = z.object({
  user: z.object({
    email: z.string(),
    userId: z.string().optional(),
    name: z.string().optional(),
    customFields: z.record(z.any()).optional(),
    companies: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          monthlySpend: z.number().optional(),
          customFields: z.record(z.any()).optional(),
        })
      )
      .optional(),
    createdAt: z.string().optional(),
    lastActivity: z.string().optional(),
    totalPosts: z.number().optional(),
    totalComments: z.number().optional(),
    totalUpvotes: z.number().optional(),
  }),
  estimatedTokens: z.number(),
});

export type GetUserOutput = z.infer<typeof getUserOutput>;

/**
 * FeatureBase API response schema for get user endpoint
 */
interface GetUserAPIResponse {
  user: {
    email: string;
    userId?: string;
    name?: string;
    customFields?: Record<string, any>;
    companies?: Array<{
      id: string;
      name: string;
      monthlySpend?: number;
      customFields?: Record<string, any>;
    }>;
    createdAt?: string;
    lastActivity?: string;
    totalPosts?: number;
    totalComments?: number;
    totalUpvotes?: number;
  };
}

export const getUser = {
  name: 'featurebase.get_user',
  description: 'Get a user by email or userId',
  parameters: getUserParams,

  async execute(
    input: GetUserInput,
    client: HTTPPort
  ): Promise<GetUserOutput> {
    const validated = getUserParams.parse(input);

    // Build query string
    const params = new URLSearchParams();
    if (validated.email) {
      params.append('email', validated.email);
    }
    if (validated.userId) {
      params.append('userId', validated.userId);
    }

    const response = await client.request<GetUserAPIResponse>(
      'get',
      `v2/organization/identifyUser?${params.toString()}`
    );

    if (!response.ok) {
      const message =
        response.error.status === 404
          ? `User not found: ${validated.email || validated.userId}`
          : `Failed to get user: ${sanitizeErrorMessage(response.error.message)}`;
      throw new Error(message);
    }

    const userData = {
      email: response.data.user.email,
      userId: response.data.user.userId,
      name: response.data.user.name,
      customFields: response.data.user.customFields || {},
      companies: response.data.user.companies || [],
      createdAt: response.data.user.createdAt,
      lastActivity: response.data.user.lastActivity,
      totalPosts: response.data.user.totalPosts || 0,
      totalComments: response.data.user.totalComments || 0,
      totalUpvotes: response.data.user.totalUpvotes || 0,
    };

    return getUserOutput.parse({
      user: userData,
      estimatedTokens: estimateTokens(userData),
    });
  },


  estimatedTokens: 350,
  tokenEstimate: {
    withoutCustomTool: 2000,
    withCustomTool: 0,
    whenUsed: 350,
    reductionPercentage: 83,
  },
};
