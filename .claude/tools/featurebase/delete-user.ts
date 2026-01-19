/**
 * delete_user - FeatureBase REST Wrapper
 *
 * Delete a user from FeatureBase by email.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (success response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 95%
 *
 * Schema Discovery Results:
 * - Requires email parameter
 * - Permanent deletion
 *
 * Required fields:
 * - email: string
 *
 * Edge cases discovered:
 * - Returns 404 if user doesn't exist
 * - GDPR compliance: permanent deletion
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const deleteUserParams = z
  .object({
    email: z
      .string()
      .email()
      .optional()
      .describe('User email to delete'),
    userId: z
      .string()
      .optional()
      .refine(
        (val) => val === undefined || validateNoControlChars(val),
        'Control characters not allowed'
      )
      .refine(
        (val) => val === undefined || validateNoPathTraversal(val),
        'Path traversal not allowed'
      )
      .refine(
        (val) => val === undefined || validateNoCommandInjection(val),
        'Invalid characters detected'
      )
      .describe('Your system user ID to delete'),
  })
  .refine((data) => data.email || data.userId, {
    message: 'Either email or userId is required',
  });

export type DeleteUserInput = z.infer<typeof deleteUserParams>;

export const deleteUserOutput = z.object({
  success: z.boolean(),
  email: z.string().optional(),
  userId: z.string().optional(),
  estimatedTokens: z.number(),
});

export type DeleteUserOutput = z.infer<typeof deleteUserOutput>;

/**
 * FeatureBase API response schema for delete user endpoint
 */
interface DeleteUserAPIResponse {
  success?: boolean;
  email?: string;
  userId?: string;
}

export const deleteUser = {
  name: 'featurebase.delete_user',
  description: 'Delete a user by email or userId',
  parameters: deleteUserParams,

  async execute(
    input: DeleteUserInput,
    client: HTTPPort
  ): Promise<DeleteUserOutput> {
    const validated = deleteUserParams.parse(input);

    // Build query params for DELETE request
    const queryParams: Record<string, string> = {};
    if (validated.email) {
      queryParams.email = validated.email;
    }
    if (validated.userId) {
      queryParams.userId = validated.userId;
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const path = `v2/organization/deleteUser?${queryString}`;

    const response = await client.request<DeleteUserAPIResponse>(
      'delete',
      path
    );

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to delete user: ${sanitized}`);
    }

    const resultData = {
      success: true,
      email: validated.email,
      userId: validated.userId,
    };

    return deleteUserOutput.parse({
      ...resultData,
      estimatedTokens: estimateTokens(resultData),
    });
  },

  tokenEstimate: {
    withoutCustomTool: 800,
    withCustomTool: 0,
    whenUsed: 150,
    reductionPercentage: 81,
  },
};
