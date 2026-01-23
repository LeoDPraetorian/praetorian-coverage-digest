/**
 * Pyghidra list_imports wrapper
 *
 * Lists imported symbols from a specified binary with server-side pagination and regex filtering.
 *
 * KEY DIFFERENCE from list_exports: Includes 'library' field identifying the source module for each import.
 *
 * Token optimization: Filters redundant fields, applies server-side pagination.
 * Target: 97% token reduction (30,000 → 900 tokens) through field filtering and limits.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { BinaryNameSchema } from './lib/schemas.js';
import { estimateTokens } from '../config/lib/response-utils.js';

// =============================================================================
// Input Validation Schemas
// =============================================================================

/**
 * Validates no control characters
 */
function validateNoControlChars(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !/[\x00-\x1F\x7F]/.test(value);
}

/**
 * Regex query schema with ReDoS protection
 */
const RegexQuerySchema = z
  .string()
  .max(128, 'Regex query too long (max: 128 characters)')
  .refine(validateNoControlChars, 'Control characters not allowed in query')
  .refine(
    (query) => {
      // Block patterns known to cause catastrophic backtracking

      // Check for nested quantifiers: (x+)+, (x*)+, (x+)*, etc.
      if (/\([^)]*[+*][^)]*\)[+*]/.test(query)) {
        return false;
      }

      // Check for multiple greedy wildcards: .*.*.* (3 or more)
      if (/(\.\*){3,}/.test(query)) {
        return false;
      }

      // Check for deeply nested groups: ((((x)))) (4+ levels)
      // Use simple depth tracking algorithm
      let depth = 0;
      let maxDepth = 0;
      for (let i = 0; i < query.length; i++) {
        if (query[i] === '(') {
          depth++;
          maxDepth = Math.max(maxDepth, depth);
        } else if (query[i] === ')') {
          depth--;
        }
      }

      if (maxDepth >= 4) {
        return false;
      }

      return true;
    },
    'Query contains potentially unsafe regex patterns (ReDoS protection)'
  )
  .refine(
    (query) => {
      // Validate regex syntax
      try {
        new RegExp(query);
        return true;
      } catch {
        return false;
      }
    },
    'Invalid regex pattern'
  )
  .optional();

/**
 * Offset schema with bounds checking
 */
const OffsetSchema = z
  .number()
  .int()
  .min(0, 'Offset must be non-negative')
  .max(100000, 'Offset exceeds maximum (max: 100000)')
  .default(0);

/**
 * Limit schema with bounds checking
 */
const LimitSchema = z
  .number()
  .int()
  .min(1, 'Limit must be between 1 and 500')
  .max(500, 'Limit must be between 1 and 500')
  .default(25);

/**
 * Input schema for list_imports wrapper
 */
export const ListImportsInputSchema = z.object({
  /**
   * Name of the binary in the Ghidra project
   * @security Validated against path traversal, command injection
   */
  binary_name: BinaryNameSchema,

  /**
   * Optional regex filter pattern to match import names
   * @example "^strcpy" - Match strcpy functions
   * @example "^SSL_" - Match OpenSSL functions
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
  limit: LimitSchema,
});

export type ListImportsInput = z.infer<typeof ListImportsInputSchema>;

// =============================================================================
// Response Types
// =============================================================================

/**
 * Raw import from MCP (includes fields to be filtered out)
 */
interface RawImport {
  name: string;
  address: string;
  type?: string;
  library: string; // KEY DIFFERENCE from list_exports
  ordinal?: number; // Will be omitted in output
  internal_id?: string; // Will be omitted in output
}

/**
 * Raw MCP response
 */
interface RawListImportsResponse {
  imports: RawImport[];
  total_count: number;
  matching_count?: number;
}

/**
 * Filtered import symbol (minimal schema for token reduction)
 */
export interface ImportedSymbol {
  name: string;
  address: string;
  type?: string;
  library: string; // Source module for the import
}

/**
 * Paginated list_imports response
 */
export interface ListImportsOutput {
  /** Array of imported symbols (paginated) */
  items: ImportedSymbol[];

  /** Pagination and summary metadata */
  summary: {
    /** Total imports in binary (before filtering) */
    total: number;

    /** Total imports matching query (if query provided) */
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

// =============================================================================
// Response Filtering
// =============================================================================

/**
 * Transform raw MCP response to minimal schema
 *
 * Token optimization strategy:
 * - Omit redundant fields (ordinal, internal_id)
 * - Keep essential data (name, address, type, library)
 * - Add pagination summary
 */
function transformImportsResponse(
  raw: RawListImportsResponse,
  input: ListImportsInput
): ListImportsOutput {
  // Transform raw imports to minimal schema
  const items: ImportedSymbol[] = raw.imports.map((imp) => ({
    name: imp.name,
    address: imp.address,
    type: imp.type ?? undefined, // Omit null values
    library: imp.library, // KEY FIELD: Source module
    // OMIT: imp.ordinal, imp.internal_id
  }));

  // Calculate hasMore based on matching_count if available (for filtered queries), otherwise total
  const relevantTotal = raw.matching_count !== undefined ? raw.matching_count : raw.total_count;

  const output: ListImportsOutput = {
    items,
    summary: {
      total: raw.total_count,
      totalMatching: raw.matching_count,
      returned: items.length,
      hasMore: relevantTotal > input.offset + items.length,
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
 * Execute list_imports wrapper
 *
 * @param input - Binary name, optional query, pagination parameters
 * @returns Paginated list of imported symbols with library information
 * @throws ValidationError for invalid input parameters
 * @throws BinaryNotFoundError if binary doesn't exist
 */
export async function execute(
  input: Partial<ListImportsInput>
): Promise<ListImportsOutput> {
  // Validate input with Zod schemas
  const validated = ListImportsInputSchema.parse(input);

  // Call MCP with validated parameters (server-side pagination)
  const raw = await callMCPTool<RawListImportsResponse>('pyghidra',
    'list_imports',
    {
      binary_name: validated.binary_name,
      query: validated.query,
      offset: validated.offset,
      limit: validated.limit,
    },
    {}
  );

  // Transform response (filter fields, add metadata)
  return transformImportsResponse(raw, validated);
}

/**
 * Tool metadata export
 */
export const listImports = {
  name: 'pyghidra.list_imports',
  description:
    'Lists imported symbols from a binary with optional regex filtering and pagination. Includes library field identifying the source module for each import.',
  parameters: ListImportsInputSchema,

  tokenEstimate: {
    withoutCustomTool: 30000, // Average unfiltered MCP response
    withCustomTool: 0, // At session start (progressive loading)
    whenUsed: 900, // Per-call with default limit=25
    reduction: '97%', // For typical binaries
  },

  execute,
};

export default listImports;
