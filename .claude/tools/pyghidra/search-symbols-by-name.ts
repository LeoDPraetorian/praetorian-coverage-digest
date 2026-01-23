/**
 * Pyghidra search_symbols_by_name wrapper
 *
 * Searches for symbols by name within a binary using substring/pattern matching.
 * Server-side search and pagination for efficient token usage.
 *
 * Token optimization: 94% reduction through:
 * - Server-side filtering (query parameter)
 * - Server-side pagination (offset/limit)
 * - Field filtering (omits internal_id)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoPathTraversal, validateNoControlChars } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

// =============================================================================
// Input Validation Schemas
// =============================================================================

const BinaryNameSchema = z
  .string()
  .min(1, 'Binary name is required')
  .max(255, 'Binary name too long (max: 255)')
  .refine(validateNoPathTraversal, 'Path traversal not allowed')
  .refine((val) => !val.includes('/') && !val.includes('\\'), 'Invalid binary name: path separators not allowed')
  .refine(validateNoControlChars, 'Control characters not allowed');

const SearchQuerySchema = z
  .string()
  .min(1, 'Query is required')
  .max(500, 'Query too long (max: 500)')
  .refine(validateNoControlChars, 'Control characters not allowed in query');

const createLimitSchema = (defaultValue: number, max: number) =>
  z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(max, `Limit too large (max: ${max})`)
    .default(defaultValue);

const OffsetSchema = z
  .number()
  .int()
  .min(0, 'Offset must be non-negative')
  .max(100000, 'Offset too large (max: 100000)')
  .default(0);

const InputSchema = z.object({
  binary_name: BinaryNameSchema,
  query: SearchQuerySchema,
  limit: createLimitSchema(25, 100),
  offset: OffsetSchema,
});

type InputType = z.infer<typeof InputSchema>;

// =============================================================================
// Response Types
// =============================================================================

interface SymbolResult {
  name: string;
  address: string;
  type?: string;
}

interface SearchSymbolsResponse {
  items: SymbolResult[];
  summary: {
    total: number;
    totalMatching: number;
    returned: number;
    hasMore: boolean;
    offset: number;
    limit: number;
  };
  estimatedTokens: number;
}

// =============================================================================
// Response Filtering
// =============================================================================

/**
 * Filter and transform raw MCP response
 *
 * Token optimization:
 * - Omit internal_id field
 * - Server-side pagination (no client-side filtering)
 */
function filterResponse(
  raw: any,
  limit: number,
  offset: number
): SearchSymbolsResponse {
  // Extract symbols array
  const rawSymbols = raw.symbols || [];
  const total = raw.total_count !== undefined ? raw.total_count : rawSymbols.length;
  const totalMatching = raw.matching_count !== undefined ? raw.matching_count : total;

  // Apply limit (defense-in-depth - server should handle this)
  const limitedSymbols = rawSymbols.slice(0, limit);

  // Transform symbols - omit internal_id
  const items: SymbolResult[] = limitedSymbols.map((raw: any) => ({
    name: raw.name || '',
    address: raw.address || '',
    type: raw.type,
  }));

  const response: SearchSymbolsResponse = {
    items,
    summary: {
      total,
      totalMatching,
      returned: items.length,
      hasMore: totalMatching > offset + items.length,
      offset,
      limit,
    },
    estimatedTokens: 0, // Calculated below
  };

  response.estimatedTokens = estimateTokens(response);
  return response;
}

// =============================================================================
// Main Execute Function
// =============================================================================

/**
 * Search symbols by name wrapper
 */
export const searchSymbolsByName = {
  name: 'pyghidra.search_symbols_by_name',
  description: 'Search for symbols by name within a binary',
  inputSchema: InputSchema,

  async execute(input: InputType): Promise<SearchSymbolsResponse> {
    // Validate input
    const validated = InputSchema.parse(input);

    try {
      // Call MCP (2-arg pattern for pyghidra)
      const raw = await callMCPTool<any>('pyghidra', 'search_symbols_by_name', {
        binary_name: validated.binary_name,
        query: validated.query,
        offset: validated.offset,
        limit: validated.limit,
      });

      // Filter and return response
      return filterResponse(raw, validated.limit, validated.offset);
    } catch (error: any) {
      // Propagate errors with proper typing
      if (error.code === 'BINARY_NOT_FOUND' || error.message?.includes('Binary not found')) {
        throw error; // Re-throw as-is
      }
      if (error.code === 'TIMEOUT' || error.message?.includes('timed out')) {
        throw error; // Re-throw as-is
      }
      if (error.message?.includes('Connection refused')) {
        // Sanitize generic errors
        throw new Error('MCP service unavailable');
      }
      throw error;
    }
  },
};

export default searchSymbolsByName;
