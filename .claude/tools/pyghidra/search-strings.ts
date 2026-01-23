/**
 * Pyghidra search_strings wrapper
 *
 * Searches for string literals within a binary's string table.
 *
 * CRITICAL: This tool does NOT redact credentials (passwords, API keys).
 * Reverse engineering requires full visibility of hardcoded secrets.
 *
 * Token optimization: Filters redundant fields, applies pagination.
 * Target: 75-85% token reduction through field filtering and limits.
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

const OffsetSchema = z
  .number()
  .int()
  .min(0, 'Offset must be non-negative')
  .max(100000, 'Offset too large (max: 100000)')
  .default(0);

const InputSchema = z.object({
  binary_name: BinaryNameSchema,
  query: SearchQuerySchema,
  limit: createLimitSchema(100, 500), // Larger limits for string extraction
  offset: OffsetSchema,
});

type InputType = z.infer<typeof InputSchema>;

// =============================================================================
// Response Types
// =============================================================================

interface StringResult {
  value: string; // CRITICAL: NOT redacted - full credential visibility
  address: string;
  section?: string;
  length?: number;
}

interface SearchStringsResponse {
  strings: StringResult[];
  summary: {
    total: number;
    returned: number;
    hasMore: boolean;
    offset: number;
    query: string;
  };
  estimatedTokens: number;
}

// Result pattern for error handling
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// =============================================================================
// Response Filtering
// =============================================================================

/**
 * Filter and transform raw MCP response
 *
 * Token optimization strategy:
 * - Omit redundant fields (binary_name, search_query, internal_id)
 * - Keep essential data (strings, addresses)
 * - Add pagination summary
 * - NO CREDENTIAL REDACTION (critical for reverse engineering)
 */
function filterResponse(
  raw: any,
  limit: number,
  offset: number,
  query: string
): SearchStringsResponse {
  // Extract strings array (handle both 'strings' and 'results' field names)
  const rawStrings = raw.strings || raw.results || [];
  const total = raw.total !== undefined ? raw.total : rawStrings.length;

  // Apply limit (defense-in-depth - server should handle this, but we enforce it)
  const limitedStrings = rawStrings.slice(0, limit);

  // Transform strings - preserve all fields, NO REDACTION
  const strings: StringResult[] = limitedStrings.map((raw: any) => ({
    value: raw.value || '', // CRITICAL: Full string value, NO redaction
    address: raw.address || '',
    section: raw.section,
    length: raw.length,
  }));

  const response: SearchStringsResponse = {
    strings,
    summary: {
      total,
      returned: strings.length,
      hasMore: total > offset + strings.length,
      offset,
      query,
    },
    estimatedTokens: 0, // Calculated below
  };

  response.estimatedTokens = estimateTokens(response);
  return response;
}

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Classify MCP errors into proper error codes
 */
function classifyError(error: any): { code: string; message: string } {
  // Binary not found with suggestions
  if (error.code === 'BINARY_NOT_FOUND' || error.message?.includes('Binary not found')) {
    return {
      code: 'BINARY_NOT_FOUND',
      message: error.message || 'Binary not found',
    };
  }

  // Timeout errors
  if (error.code === 'TIMEOUT' || error.message?.includes('timed out')) {
    return {
      code: 'TIMEOUT',
      message: 'MCP operation timed out',
    };
  }

  // Connection errors
  if (error.message?.includes('Connection refused') || error.message?.includes('ECONNREFUSED')) {
    return {
      code: 'CONNECTION_ERROR',
      message: 'MCP service unavailable',
    };
  }

  // Validation errors (from Zod)
  if (error.name === 'ZodError' || error.issues) {
    const firstIssue = error.issues?.[0];
    return {
      code: 'INVALID_PARAMS',
      message: firstIssue?.message || 'Invalid input parameters',
    };
  }

  // Generic errors
  return {
    code: 'INTERNAL_ERROR',
    message: error.message || 'Unknown error occurred',
  };
}

// =============================================================================
// Main Execute Function
// =============================================================================

/**
 * Execute search_strings wrapper
 *
 * @param input - Binary name, query, limit, and offset
 * @returns Result with strings data or error
 */
export async function execute(input: Partial<InputType>): Promise<Result<SearchStringsResponse>> {
  try {
    // Validate input with Zod schemas
    const validated = InputSchema.parse(input);

    // Call MCP server
    const raw = await callMCPTool<any>('pyghidra',
      'search_strings',
      {
        binary_name: validated.binary_name,
        query: validated.query,
        limit: validated.limit,
        offset: validated.offset,
      },
      {}
    );

    // Filter response and return
    const filtered = filterResponse(raw, validated.limit, validated.offset, validated.query);

    return { ok: true, data: filtered };
  } catch (error: any) {
    // Classify and return error
    const classified = classifyError(error);
    return {
      ok: false,
      error: classified,
    };
  }
}

// Export default for compatibility
export default { execute };
