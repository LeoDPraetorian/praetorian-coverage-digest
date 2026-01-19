/**
 * identify_user - FeatureBase REST Wrapper
 *
 * Create or update a user in FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (user record)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 90%
 *
 * Schema Discovery Results:
 * - Upsert operation (create or update)
 * - Requires email as primary identifier
 * - Optional userId for custom IDs
 *
 * Required fields:
 * - email: string
 *
 * Optional fields:
 * - userId: string
 * - name: string
 * - customFields: object
 *
 * Edge cases discovered:
 * - Creates if doesn't exist, updates if exists
 * - email is primary identifier
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';

export const identifyUserParams = z.object({
  email: z.string()
    .email()
    .optional()
    .describe('User email address'),

  userId: z.string()
    .optional()
    .refine(val => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine(val => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine(val => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('User ID'),

  name: z.string()
    .max(255, 'name cannot exceed 255 characters')
    .optional()
    .refine(val => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine(val => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine(val => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('User name'),

  customFields: z.record(z.string(), z.any())
    .optional()
    .describe('Custom user fields'),

  companies: z.array(z.object({
    id: z.string()
      .min(1, 'company id is required'),
    name: z.string()
      .min(1, 'company name is required'),
    monthlySpend: z.number()
      .optional(),
    customFields: z.record(z.string(), z.any())
      .optional(),
  }))
    .optional()
    .describe('Associated companies'),
}).refine(data => data.email || data.userId, {
  message: 'Either email or userId is required',
});

export type IdentifyUserInput = z.infer<typeof identifyUserParams>;

export const identifyUserOutput = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
    customFields: z.record(z.string(), z.any()).optional(),
    companies: z.array(z.object({
      id: z.string(),
      name: z.string(),
      monthlySpend: z.number().optional(),
      customFields: z.record(z.string(), z.any()).optional(),
    })).optional(),
  }),
  estimatedTokens: z.number(),
});

export type IdentifyUserOutput = z.infer<typeof identifyUserOutput>;

/**
 * FeatureBase API response schema for identify endpoint (wrapped format)
 */
interface IdentifyUserAPIResponse {
  success: boolean;
  user: {
    id?: string;
    email?: string;
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
    updatedAt?: string;
  };
  action: 'created' | 'updated';
}

export const identifyUser = {
  name: 'featurebase.identify_user',
  description: 'Identify or update a user in FeatureBase (upsert)',
  parameters: identifyUserParams,

  async execute(
    input: IdentifyUserInput,
    client: HTTPPort
  ): Promise<IdentifyUserOutput> {
    const validated = identifyUserParams.parse(input);

    const response = await client.request<IdentifyUserAPIResponse>('post', 'v2/organization/identifyUser', {
      json: {
        ...(validated.email && { email: validated.email }),
        ...(validated.userId && { userId: validated.userId }),
        ...(validated.name && { name: validated.name }),
        ...(validated.customFields && { customFields: validated.customFields }),
        ...(validated.companies && { companies: validated.companies }),
      },
    });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to identify user: ${sanitized}`);
    }

    // Extract user from wrapped response
    const apiResponse = response.data;
    const user = apiResponse.user;

    const userData = {
      id: user.id || user.userId || '',
      email: user.email,
      name: user.name,
      customFields: user.customFields,
      companies: user.companies,
    };

    return identifyUserOutput.parse({
      user: userData,
      estimatedTokens: estimateTokens(userData),
    });
  },

  tokenEstimate: {
    withoutCustomTool: 1500,
    withCustomTool: 0,
    whenUsed: 300,
    reductionPercentage: 80,
  },
};
