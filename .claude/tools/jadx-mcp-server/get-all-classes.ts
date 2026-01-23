/**
 * JADX MCP Wrapper: get-all-classes
 *
 * Pattern: paginated_list (pagination only, no name parameters)
 * Purpose: Lists all classes in the loaded APK with pagination support
 * Security: LOW (numeric validation only via CountSchema/OffsetSchema)
 *
 * Token optimization: Already optimal (~8 tokens per class name)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { addTokenEstimation, handleMCPError, validateArrayResponse } from './utils.js';
import { PaginationSchema } from './shared-schemas.js';

// ============================================================================
// Input Schema (REUSE from shared-schemas.ts)
// ============================================================================

/**
 * Input schema for get-all-classes
 * Reuses PaginationSchema: { count?: number, offset?: number }
 */
const InputSchema = PaginationSchema;

export type GetAllClassesInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

/**
 * Response structure for get-all-classes
 */
export interface GetAllClassesOutput {
  /** Array of fully qualified class names */
  items: string[];
  /** Pagination metadata */
  pagination: {
    /** Number of items skipped */
    offset: number;
    /** Maximum items requested */
    limit: number;
    /** Total classes in project */
    total: number;
    /** Whether more classes exist beyond this page */
    hasMore: boolean;
  };
  /** Estimated token count for LLM context awareness */
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

/**
 * Filter and transform raw MCP response
 */
function filterResponse(
  rawData: unknown,
  params: { count: number; offset: number }
): GetAllClassesOutput {
  // Extract array from { result: [] } format
  const allItems = validateArrayResponse(rawData, 'get-all-classes');

  // Apply pagination (MCP returns all, we slice)
  const items = allItems.slice(params.offset, params.offset + params.count);
  const total = allItems.length;

  return addTokenEstimation({
    items,
    pagination: {
      offset: params.offset,
      limit: params.count,
      total,
      hasMore: params.offset + params.count < total,
    },
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getAllClasses = {
  name: 'jadx.get-all-classes',
  description: 'Lists all classes in the loaded APK with pagination. Returns fully qualified class names.',
  inputSchema: InputSchema,

  async execute(input: GetAllClassesInput = {}): Promise<GetAllClassesOutput> {
    // Validate and apply defaults
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_all_classes', {
        count: validated.count,
        offset: validated.offset,
      });
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'get-all-classes');
    }
  },
};

export default getAllClasses;
