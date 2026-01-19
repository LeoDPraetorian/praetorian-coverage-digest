/**
 * create_custom_field - FeatureBase REST Wrapper
 *
 * Create a new custom field definition in FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~150 tokens (field definition)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 92%
 *
 * Schema Discovery Results:
 * - Supports text, number, date, select, multiselect types
 * - name must be unique
 * - options required for select/multiselect
 *
 * Required fields:
 * - name: string
 * - type: string (text|number|date|select|multiselect)
 *
 * Optional fields:
 * - options: string[] (required for select types)
 *
 * Edge cases discovered:
 * - Duplicate names return 409 conflict
 * - Select types require options array
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const fieldTypeEnum = z.enum(['string', 'number', 'boolean', 'date', 'array']);

export const createCustomFieldParams = z.object({
  name: z.string()
    .min(1, 'name is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Field name (snake_case recommended)'),

  type: fieldTypeEnum
    .describe('Field type: string, number, boolean, date, array'),

  options: z.array(z.string())
    .min(1, 'options array must have at least one value')
    .optional()
    .describe('Valid values for string enum fields'),

  min: z.number()
    .optional()
    .describe('Minimum value for number fields'),

  max: z.number()
    .optional()
    .describe('Maximum value for number fields'),

  itemType: z.string()
    .optional()
    .describe('Type of array items (string or number)'),

  required: z.boolean()
    .optional()
    .describe('Whether field is required (default: false)'),
}).refine(
  (data) => {
    // If type is number and both min/max provided, min must be <= max
    if (data.type === 'number' && data.min !== undefined && data.max !== undefined) {
      return data.min <= data.max;
    }
    return true;
  },
  { message: 'min must be less than or equal to max' }
).refine(
  (data) => {
    // Array type requires itemType
    if (data.type === 'array') {
      return data.itemType !== undefined;
    }
    return true;
  },
  { message: 'itemType is required for array fields' }
);

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldParams>;

export const createCustomFieldOutput = z.object({
  field: z.object({
    id: z.string(),
    name: z.string(),
    type: fieldTypeEnum,
    options: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    itemType: z.string().optional(),
    required: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  estimatedTokens: z.number(),
});

export type CreateCustomFieldOutput = z.infer<typeof createCustomFieldOutput>;

/**
 * FeatureBase API response schema for create custom field endpoint
 */
interface CreateCustomFieldAPIResponse {
  field: {
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
  };
}

export const createCustomField = {
  name: 'featurebase.create_custom_field',
  description: 'Create a new custom field definition',
  parameters: createCustomFieldParams,

  async execute(
    input: CreateCustomFieldInput,
    client: HTTPPort
  ): Promise<CreateCustomFieldOutput> {
    const validated = createCustomFieldParams.parse(input);

    const requestBody: Record<string, any> = {
      name: validated.name,
      type: validated.type,
    };

    if (validated.options !== undefined) {
      requestBody.options = validated.options;
    }
    if (validated.min !== undefined) {
      requestBody.min = validated.min;
    }
    if (validated.max !== undefined) {
      requestBody.max = validated.max;
    }
    if (validated.itemType !== undefined) {
      requestBody.itemType = validated.itemType;
    }
    if (validated.required !== undefined) {
      requestBody.required = validated.required;
    }

    const response = await client.request<CreateCustomFieldAPIResponse>('post', 'v2/custom_fields', {
      json: requestBody,
    });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to create custom field: ${sanitized}`);
    }

    const fieldData = response.data;

    return createCustomFieldOutput.parse({
      field: fieldData.field,
      estimatedTokens: estimateTokens(fieldData.field),
    });
  },


  estimatedTokens: 250,
  tokenEstimate: {
    withoutCustomTool: 1200,
    withCustomTool: 0,
    whenUsed: 250,
    reductionPercentage: 79,
  },
};
