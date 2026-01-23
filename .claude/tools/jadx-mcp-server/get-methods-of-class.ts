/**
 * JADX MCP Wrapper: get-methods-of-class
 *
 * Pattern: paginated_list
 * Lists all methods in a specific class with pagination support.
 *
 * Security: MEDIUM
 * - class_name validated via JavaClassNameSchema (4-layer defense)
 * - count/offset bounded by CountSchema/OffsetSchema
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import {
  JavaClassNameSchema,
  CountSchema,
  OffsetSchema
} from './shared-schemas.js';
import {
  addTokenEstimation,
  handleMCPError,
  validateArrayResponse
} from './utils.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  class_name: JavaClassNameSchema,
  count: CountSchema,
  offset: OffsetSchema,
}).strict();

export type GetMethodsOfClassInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Types
// ============================================================================

export interface MethodInfo {
  name: string;
  signature: string;
}

export interface GetMethodsOfClassOutput {
  items: MethodInfo[];
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
): GetMethodsOfClassOutput {
  const items = validateArrayResponse(rawData, 'get-methods-of-class');
  const total = items.length;

  // Slice to requested count (offset already applied by MCP)
  const paginated = items.slice(0, params.count);

  return addTokenEstimation({
    items: paginated.map((item: any) => ({
      name: typeof item.name === 'string' ? item.name : '[unknown]',
      signature: typeof item.signature === 'string' ? item.signature : '',
    })),
    pagination: {
      offset: params.offset,
      limit: params.count,
      total,
      hasMore: total > params.count,
    },
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getMethodsOfClass = {
  name: 'jadx.get-methods-of-class',
  description: 'List all methods in a specific class with pagination. Returns method names and signatures.',
  inputSchema: InputSchema,

  async execute(input: GetMethodsOfClassInput): Promise<GetMethodsOfClassOutput> {
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_methods_of_class', {
        class_name: validated.class_name,
        count: validated.count,
        offset: validated.offset,
      });
      return filterResponse(raw, {
        count: validated.count,
        offset: validated.offset,
      });
    } catch (error) {
      handleMCPError(error, 'get-methods-of-class');
    }
  },
};

export default getMethodsOfClass;
