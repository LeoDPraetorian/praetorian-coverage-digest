/**
 * Pyghidra list_exports wrapper
 *
 * Lists all exported functions and symbols from a specified binary.
 * Exports are symbols that a binary makes available to other modules.
 *
 * Token optimization: Server-side pagination with strict limits and summary metadata.
 * Target: 97% token reduction through pagination.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import {
  BinaryNameSchema,
  RegexQuerySchema,
  OffsetSchema,
  createLimitSchema,
} from './lib/schemas.js';
import { BinaryNotFoundError, parseMcpError } from './lib/errors.js';

// =============================================================================
// Input Validation Schema
// =============================================================================

/**
 * Input schema for list_exports wrapper
 *
 * Uses shared schemas with security validations:
 * - BinaryNameSchema: Path traversal, command injection, control char prevention
 * - RegexQuerySchema: ReDoS protection, length limits
 * - OffsetSchema: Non-negative integer with max bound
 * - createLimitSchema: Configurable default/max limits
 */
export const ListExportsInputSchema = z.object({
  /**
   * Name of the binary in the Ghidra project
   * @security Validated against path traversal, command injection
   */
  binary_name: BinaryNameSchema,

  /**
   * Optional regex filter pattern to match export names
   * @example "^SSL_" - Match OpenSSL functions
   * @example "Init$" - Match initialization functions
   * @security ReDoS protection via pattern complexity limits
   */
  query: RegexQuerySchema,

  /**
   * Pagination offset (0-indexed)
   * @default 0
   */
  offset: OffsetSchema,

  /**
   * Maximum results to return
   * @default 25
   * @max 500
   */
  limit: createLimitSchema(25, 500),
});

export type ListExportsInput = z.infer<typeof ListExportsInputSchema>;

// =============================================================================
// Response Types
// =============================================================================

/**
 * Single exported symbol
 */
interface ExportedSymbol {
  /** Symbol name (function, variable, or object) */
  name: string;

  /** Memory address in hex format (e.g., "0x00401000") */
  address: string;

  /** Symbol type if available (function, data, unknown) */
  type?: string;
}

/**
 * Paginated list_exports response
 */
export interface ListExportsOutput {
  /** Array of exported symbols (paginated) */
  items: ExportedSymbol[];

  /** Pagination and summary metadata */
  summary: {
    /** Total exports in binary (before filtering) */
    total: number;

    /** Total exports matching query (if query provided) */
    totalMatching?: number;

    /** Number of items in this response */
    returned: number;

    /** Whether more results exist beyond this page */
    hasMore: boolean;

    /** Current pagination offset */
    offset: number;

    /** Limit used for this request */
    limit: number;
  };

  /** Estimated token count for this response */
  estimatedTokens: number;
}

/**
 * Raw MCP response type (before transformation)
 */
interface RawExport {
  name: string;
  address: string;
  type?: string;
  ordinal?: number; // Omit in output
  internal_id?: string; // Omit in output
}

interface RawListExportsResponse {
  exports: RawExport[];
  total_count: number;
  matching_count?: number;
}

// =============================================================================
// Response Transformation
// =============================================================================

/**
 * Transform raw MCP response to optimized output
 *
 * Token optimization strategy:
 * - Omit redundant fields (ordinal, internal_id)
 * - Keep essential data (name, address, type)
 * - Add pagination summary
 * - Calculate token estimate
 */
function transformExportsResponse(
  raw: RawListExportsResponse,
  input: ListExportsInput
): ListExportsOutput {
  // Transform raw symbols to minimal schema
  const items = raw.exports.map((exp) => ({
    name: exp.name,
    address: exp.address,
    type: exp.type ?? undefined, // Omit null values
    // OMIT: exp.ordinal, exp.internal_id
  }));

  // Calculate hasMore based on totalMatching if query provided, otherwise total
  // When filtering, hasMore is based on matching results, not total count
  const relevantTotal =
    raw.matching_count !== undefined ? raw.matching_count : raw.total_count;
  const hasMore = relevantTotal > input.offset + items.length;

  const output: ListExportsOutput = {
    items,
    summary: {
      total: raw.total_count,
      totalMatching: raw.matching_count,
      returned: items.length,
      hasMore,
      offset: input.offset,
      limit: input.limit,
    },
    estimatedTokens: 0, // Calculated below
  };

  // Add token estimate
  output.estimatedTokens = estimateTokens(output);

  return output;
}

// =============================================================================
// Main Execute Function
// =============================================================================

/**
 * Export wrapper for list_exports tool
 */
export const listExports = {
  name: 'pyghidra.list_exports',
  description:
    'Lists exported symbols from a binary with optional regex filtering and pagination',
  parameters: ListExportsInputSchema,

  tokenEstimate: {
    withoutCustomTool: 30000, // Average unfiltered MCP response
    withCustomTool: 0, // At session start (progressive loading)
    whenUsed: 900, // Per-call with default limit=25
    reduction: '97%', // For typical binaries
  },

  /**
   * Execute list_exports wrapper
   *
   * @param input - Binary name, query, limit, and offset
   * @returns Paginated list of exports with summary metadata
   * @throws BinaryNotFoundError - Binary does not exist in Ghidra project
   * @throws ValidationError - Invalid input parameters
   * @throws PyghidraError - MCP operation failed
   */
  async execute(input: ListExportsInput): Promise<ListExportsOutput> {
    // 1. Validate input (Zod schema validation)
    const validated = ListExportsInputSchema.parse(input);

    // 2. Call MCP with validated parameters
    let mcpResponse: RawListExportsResponse;
    try {
      mcpResponse = await callMCPTool<RawListExportsResponse>('pyghidra',
        'list_exports',
        {
          binary_name: validated.binary_name,
          query: validated.query,
          offset: validated.offset,
          limit: validated.limit,
        },
        {}
      );
    } catch (error: any) {
      // Handle MCP errors with typed error classes
      // Check for binary not found with suggestions
      if (error.code === 'BINARY_NOT_FOUND' || error.message?.includes('Binary not found')) {
        const suggestions = error.details?.suggestions;
        throw new BinaryNotFoundError(validated.binary_name, suggestions);
      }

      // Re-throw other errors
      throw parseMcpError(error);
    }

    // 3. Transform response (filter fields, add metadata)
    return transformExportsResponse(mcpResponse, validated);
  },
};
