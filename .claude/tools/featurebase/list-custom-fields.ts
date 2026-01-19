/**
 * list_custom_fields - FeatureBase REST Wrapper
 *
 * Fetch list of custom field definitions.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (field definitions)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 85%
 *
 * Schema Discovery Results:
 * - Returns all custom fields
 * - No pagination (returns all)
 * - Includes field type and options
 *
 * No required fields
 *
 * Edge cases discovered:
 * - Returns all fields (no pagination)
 * - Select fields include options array
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * Input schema for list-custom-fields
 * No parameters required - lists all custom fields
 */
export const listCustomFieldsParams = z.object({});

export type ListCustomFieldsInput = z.infer<typeof listCustomFieldsParams>;

/**
 * Output schema for list-custom-fields
 * Returns array of custom field definitions
 */
export const listCustomFieldsOutput = z.object({
  fields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'date', 'array']),
    options: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    itemType: z.string().optional(),
    required: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  estimatedTokens: z.number(),
});

export type ListCustomFieldsOutput = z.infer<typeof listCustomFieldsOutput>;

/**
 * List custom fields tool
 */
export const listCustomFields = {
  name: 'featurebase.list_custom_fields',
  description: 'List all custom field definitions',
  parameters: listCustomFieldsParams,

  async execute(
    _input: ListCustomFieldsInput,
    client: HTTPPort
  ): Promise<ListCustomFieldsOutput> {
    // No input parameters to validate

    // Make request
    // API returns: {fields: [...]}
    const response = await client.request<{
      fields: Array<{
        id: string;
        name: string;
        type: 'string' | 'number' | 'boolean' | 'date' | 'array';
        options?: string[];
        min?: number;
        max?: number;
        itemType?: string;
        required: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('get', 'v2/custom_fields');

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`FeatureBase API error: ${sanitized}`);
    }

    // Return with token estimation
    const result = {
      fields: response.data.fields || [],
      estimatedTokens: estimateTokens(response.data),
    };

    return listCustomFieldsOutput.parse(result);
  },


  estimatedTokens: 300,
  tokenEstimate: {
    withoutCustomTool: 1500,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '80%',
  },
};
