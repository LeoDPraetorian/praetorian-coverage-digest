/**
 * Pyghidra search_code wrapper
 *
 * Searches for code within a binary by similarity using vector embeddings.
 * Optimizes token usage through field filtering and code preview truncation.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoPathTraversal, validateNoControlChars } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

// Input validation schemas
const BinaryNameSchema = z
  .string()
  .min(1, 'Binary name is required')
  .max(255, 'Binary name too long (max: 255)')
  .refine(validateNoPathTraversal, 'Path traversal not allowed')
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
    .min(1)
    .max(max, `Limit too large (max: ${max})`)
    .default(defaultValue);

const InputSchema = z.object({
  binary_name: BinaryNameSchema,
  query: SearchQuerySchema,
  limit: createLimitSchema(10, 25),
});

type InputType = z.infer<typeof InputSchema>;

// Response types
interface SearchCodeResult {
  function_name: string;
  address: string;
  similarity: number;
  code_preview: string;
}

interface SearchCodeResponse {
  results: SearchCodeResult[];
  summary: {
    total: number;
    returned: number;
    hasMore: boolean;
    query: string;
  };
  estimatedTokens: number;
}

// Constants
const CODE_PREVIEW_MAX_CHARS = 500;
const CODE_PREVIEW_SUFFIX = '\n// ... [truncated - use decompile_function for full code]';

/**
 * Normalize similarity score to 0.0-1.0 range
 */
function normalizeSimilarity(raw: number): number {
  if (typeof raw !== 'number' || isNaN(raw)) return 0;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Truncate code preview to maximum character limit
 */
function truncateCodePreview(code: string | undefined): string {
  if (!code) return '';

  if (code.length <= CODE_PREVIEW_MAX_CHARS) {
    return code;
  }

  // Truncate at line boundary when possible
  const truncated = code.substring(0, CODE_PREVIEW_MAX_CHARS);
  const lastNewline = truncated.lastIndexOf('\n');

  if (lastNewline > CODE_PREVIEW_MAX_CHARS * 0.8) {
    // Found a reasonable line break in last 20%
    return truncated.substring(0, lastNewline) + CODE_PREVIEW_SUFFIX;
  }

  return truncated + CODE_PREVIEW_SUFFIX;
}

/**
 * Filter and transform raw MCP response
 */
function filterResponse(
  rawResults: any[],
  limit: number,
  query: string
): SearchCodeResponse {
  // Apply limit
  const limitedResults = rawResults.slice(0, limit);

  // Filter and transform each result
  const results = limitedResults.map((raw) => ({
    function_name: raw.function_name || '',
    address: raw.address || '',
    similarity: normalizeSimilarity(raw.similarity),
    code_preview: truncateCodePreview(raw.code_preview),
  }));

  const response: SearchCodeResponse = {
    results,
    summary: {
      total: rawResults.length,
      returned: results.length,
      hasMore: rawResults.length > limit,
      query,
    },
    estimatedTokens: 0, // Calculated below
  };

  response.estimatedTokens = estimateTokens(response);
  return response;
}

/**
 * Search code wrapper
 */
export const searchCode = {
  name: 'pyghidra.search_code',
  description: 'Search for code within a binary by similarity using vector embeddings',
  inputSchema: InputSchema,

  async execute(input: InputType): Promise<SearchCodeResponse> {
    // Validate input
    const validated = InputSchema.parse(input);

    try {
      // Call MCP
      const raw = await callMCPTool<{ results: any[] }>('pyghidra',
        'search_code',
        {
          binary_name: validated.binary_name,
          query: validated.query,
          limit: validated.limit,
        },
        {}
      );

      // Filter and return response
      return filterResponse(raw.results || [], validated.limit, validated.query);
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

export default searchCode;
