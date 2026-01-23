/**
 * JADX MCP Wrapper: get-main-application-classes-names
 *
 * Pattern: paginated_list (pagination only, no name parameters)
 * Purpose: Lists main application class names (filters out library/SDK classes)
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
 * Input schema for get-main-application-classes-names
 * Reuses PaginationSchema: { count?: number, offset?: number }
 */
const InputSchema = PaginationSchema;

export type GetMainApplicationClassesNamesInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

/**
 * Response structure for get-main-application-classes-names
 */
export interface GetMainApplicationClassesNamesOutput {
  /** Array of main application class names (filtered from library/SDK classes) */
  items: string[];
  /** Pagination metadata */
  pagination: {
    /** Number of items skipped */
    offset: number;
    /** Maximum items requested */
    limit: number;
    /** Total main application classes in project */
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
): GetMainApplicationClassesNamesOutput {
  // Extract array from { result: [] } format
  const allItems = validateArrayResponse(rawData, 'get-main-application-classes-names');

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

export const getMainApplicationClassesNames = {
  name: 'jadx.get-main-application-classes-names',
  description: 'Lists main application class names (filters out library/SDK classes). Returns fully qualified class names for app-specific code.',
  inputSchema: InputSchema,

  async execute(input: GetMainApplicationClassesNamesInput = {}): Promise<GetMainApplicationClassesNamesOutput> {
    // Validate and apply defaults
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_main_application_classes_names', {
        count: validated.count,
        offset: validated.offset,
      });
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'get-main-application-classes-names');
    }
  },
};

export default getMainApplicationClassesNames;
