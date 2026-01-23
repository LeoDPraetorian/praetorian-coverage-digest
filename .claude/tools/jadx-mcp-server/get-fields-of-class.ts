/**
 * JADX MCP Wrapper: get-fields-of-class
 * Pattern: paginated_list (with class_name parameter)
 *
 * Lists all fields in a specific class with pagination support.
 * Returns field names, types, and modifiers.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { handleMCPError, validateArrayResponse } from './utils.js';
import {
  JavaClassNameSchema,
  CountSchema,
  OffsetSchema,
} from './shared-schemas.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  class_name: JavaClassNameSchema,
  count: CountSchema,
  offset: OffsetSchema,
}).strict();

export type GetFieldsOfClassInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Schema
// ============================================================================

export interface FieldInfo {
  name: string;
  type: string;
  modifiers: string;
}

export interface GetFieldsOfClassOutput {
  items: FieldInfo[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

function filterResponse(
  rawData: unknown,
  params: { count: number; offset: number }
): GetFieldsOfClassOutput {
  const allItems = validateArrayResponse(rawData, 'get-fields-of-class') as FieldInfo[];

  // Note: MCP server may handle pagination, but we apply it client-side for safety
  const paginatedItems = allItems.slice(params.offset, params.offset + params.count);

  const response = {
    items: paginatedItems,
    pagination: {
      offset: params.offset,
      limit: params.count,
      total: allItems.length,
      hasMore: params.offset + paginatedItems.length < allItems.length,
    },
  };

  return {
    ...response,
    estimatedTokens: estimateTokens(response),
  };
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getFieldsOfClass = {
  name: 'jadx.get-fields-of-class',
  description: 'Lists all fields in a specific class with pagination. Returns field names, types, and modifiers.',
  inputSchema: InputSchema,

  async execute(input: GetFieldsOfClassInput): Promise<GetFieldsOfClassOutput> {
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_fields_of_class', {
        class_name: validated.class_name,
        count: validated.count,
        offset: validated.offset,
      });
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'get-fields-of-class');
    }
  },
};

export default getFieldsOfClass;
