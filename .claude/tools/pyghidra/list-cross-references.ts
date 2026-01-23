/**
 * list_cross_references wrapper for pyghidra MCP
 *
 * Lists cross-references (x-refs) to a given function or memory address in a binary.
 * Implements client-side pagination and type filtering for 90-95% token reduction.
 *
 * Key features:
 * - Client-side pagination (MCP returns all x-refs at once)
 * - Type filtering (CALL, READ, WRITE, ALL)
 * - Union schema for name_or_address (symbol name OR hex address)
 * - Security: validates binary names, prevents path traversal/injection
 *
 * Use cases:
 * - Reverse engineering: Find all callers of a function
 * - Vulnerability analysis: Trace data flow to/from sensitive functions
 * - Code understanding: Map function relationships
 */

import { z, ZodError } from 'zod';
import { BinaryNameSchema, SymbolNameSchema } from './lib/schemas.js';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

// =============================================================================
// Input Schemas
// =============================================================================

/**
 * X-ref type filter options
 * - CALL: Function calls (most common use case)
 * - READ: Data reads (memory access)
 * - WRITE: Data writes (memory modification)
 * - ALL: No filtering (return all types)
 */
export const XrefTypeSchema = z
  .enum(['CALL', 'READ', 'WRITE', 'ALL'])
  .default('CALL')
  .describe('Type of cross-references to return (default: CALL)');

/**
 * Limit schema for x-refs (client-side pagination)
 * Higher default than other list tools because x-refs are smaller per item
 */
export const XrefLimitSchema = z.coerce
  .number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(200, 'Limit too large (max: 200)')
  .default(50)
  .describe('Max x-refs to return (default: 50, max: 200)');

/**
 * Offset schema for pagination
 */
export const OffsetSchema = z.coerce
  .number()
  .int('Offset must be an integer')
  .min(0, 'Offset must be non-negative')
  .max(100000, 'Offset too large')
  .default(0)
  .describe('Pagination offset (default: 0)');

/**
 * Union schema for name_or_address parameter
 * Accepts either a function name OR a hex address
 *
 * Function names: alphanumeric with underscores, e.g., "main", "_start", "__libc_start_main"
 * Addresses: hex format with optional 0x prefix, e.g., "0x401000", "401000"
 */
export const NameOrAddressSchema = z
  .string()
  .min(1, 'Function address or name is required')
  .max(500, 'Input too long (max 500 chars)')
  .refine(
    (value) => {
      // If starts with '0x', must be valid hex address
      if (value.startsWith('0x')) {
        // Must have at least one hex digit after '0x'
        if (value.length === 2) return false;
        // Rest must be hex digits only
        const hexPart = value.substring(2);
        if (!/^[0-9a-fA-F]+$/.test(hexPart)) return false;
        // Max 16 hex digits (64-bit address)
        if (hexPart.length > 16) return false;
        return true;
      }

      // Check if it's a pure hex string without 0x prefix
      const isPureHex = /^[0-9a-fA-F]+$/.test(value);
      if (isPureHex) {
        // Max 16 hex digits (64-bit address)
        if (value.length > 16) return false;
        return true;
      }

      // Detect hex-like patterns that are likely typos (e.g., 'g401000')
      // Single letter followed by 5+ hex digits looks like a typo of a hex address
      const looksLikeHexTypo = /^[a-zA-Z]([0-9a-fA-F]{5,16})$/.test(value);
      if (looksLikeHexTypo) {
        // This looks like someone tried to type a hex address but made a mistake
        return false;
      }

      // Otherwise, check if it's a valid symbol name
      // Must start with letter or underscore, followed by alphanumeric, underscore, @, or .
      const isSymbolName = /^[a-zA-Z_][a-zA-Z0-9_@.]*$/.test(value);
      return isSymbolName;
    },
    {
      message:
        'Must be a valid function name (e.g., "main") or hex address (e.g., "0x401000")',
    }
  )
  .describe('Function name or memory address to find cross-references for');

/**
 * Complete input schema for list_cross_references
 */
export const listCrossReferencesParams = z.object({
  binary_name: BinaryNameSchema,
  name_or_address: NameOrAddressSchema,
  filter_type: XrefTypeSchema,
  limit: XrefLimitSchema,
  offset: OffsetSchema,
});

export type ListCrossReferencesInput = z.infer<typeof listCrossReferencesParams>;

// =============================================================================
// Output Schemas
// =============================================================================

/**
 * Single cross-reference in response
 */
export interface CrossReferenceOutput {
  from_address: string;
  from_function: string;
  to_address: string;
  to_function: string;
  type: string;
}

/**
 * Complete response schema
 */
export interface ListCrossReferencesOutput {
  cross_references: CrossReferenceOutput[];
  summary: {
    total_all_types: number;
    total_filtered: number;
    returned: number;
    hasMore: boolean;
  };
  pagination: {
    offset: number;
    limit: number;
    next_offset: number | null;
  };
  estimatedTokens: number;
}

/**
 * Raw MCP response structure (VERIFIED via HTTP client testing 2026-01-20)
 *
 * CRITICAL: PyGhidra MCP server uses different field names than documented:
 * - Returns `function_name` (NOT `from_function`)
 * - Returns `type` (NOT `ref_type`)
 * - Does NOT provide `to_function` separately
 */
interface RawMcpCrossReference {
  from_address: string;
  function_name?: string | null;  // ← ACTUAL field name from MCP server
  to_address: string;
  type: string;  // ← ACTUAL field name from MCP server

  // Legacy field names (for backwards compatibility if server changes)
  from_function?: string;
  ref_type?: string;
}

interface RawMcpResponse {
  cross_references: RawMcpCrossReference[];
}

/**
 * Output Zod schema for validation
 */
const CrossReferenceSchema = z.object({
  from_address: z.string(),
  from_function: z.string(),
  to_address: z.string(),
  to_function: z.string(),
  type: z.string(),
});

const ListCrossReferencesOutputSchema = z.object({
  cross_references: z.array(CrossReferenceSchema),
  summary: z.object({
    total_all_types: z.number(),
    total_filtered: z.number(),
    returned: z.number(),
    hasMore: z.boolean(),
  }),
  pagination: z.object({
    offset: z.number(),
    limit: z.number(),
    next_offset: z.number().nullable(),
  }),
  estimatedTokens: z.number(),
});

// =============================================================================
// Implementation
// =============================================================================

/**
 * Client-side pagination for cross-references
 *
 * Flow:
 * 1. Filter by type (if filter_type != ALL)
 * 2. Apply offset/limit pagination
 * 3. Return paginated subset with summary metadata
 */
function paginateCrossRefs(
  allRefs: RawMcpCrossReference[],
  filterType: 'CALL' | 'READ' | 'WRITE' | 'ALL',
  offset: number,
  limit: number
): ListCrossReferencesOutput {
  // Step 1: Filter by type
  // CRITICAL: PyGhidra MCP returns 'type' field (verified 2026-01-20)
  const filtered =
    filterType === 'ALL'
      ? allRefs
      : allRefs.filter((ref) => (ref.type || ref.ref_type) === filterType);

  // Step 2: Apply pagination
  const paginated = filtered.slice(offset, offset + limit);

  // Step 3: Format cross-references
  const formattedRefs: CrossReferenceOutput[] = paginated.map((ref) => ({
    from_address: ref.from_address,
    // CRITICAL FIX: PyGhidra MCP returns 'function_name' not 'from_function'
    // Try function_name first, then fall back to from_function for backwards compatibility
    from_function: (() => {
      const funcName = ref.function_name || ref.from_function;
      return funcName && String(funcName).trim() !== '' && funcName !== 'null' ? String(funcName) : 'unknown';
    })(),
    to_address: ref.to_address,
    // Server doesn't provide to_function separately - would need additional lookup
    to_function: 'unknown',
    // PyGhidra MCP uses 'type' field (verified 2026-01-20)
    type: ref.type || ref.ref_type || 'UNKNOWN',
  }));

  // Step 4: Build response with metadata
  const response: ListCrossReferencesOutput = {
    cross_references: formattedRefs,
    summary: {
      total_all_types: allRefs.length,
      total_filtered: filtered.length,
      returned: formattedRefs.length,
      hasMore: filtered.length > offset + limit,
    },
    pagination: {
      offset,
      limit,
      next_offset:
        filtered.length > offset + limit ? offset + limit : null,
    },
    estimatedTokens: 0, // Will be calculated after
  };

  // Calculate token estimate
  response.estimatedTokens = estimateTokens(response);

  return response;
}

/**
 * Execute list_cross_references wrapper
 *
 * @param input - Validated input parameters
 * @returns Filtered and paginated cross-references with metadata
 * @throws Error when validation fails, binary not found, or symbol not found
 */
export async function execute(
  input: ListCrossReferencesInput
): Promise<ListCrossReferencesOutput> {
  // Step 1: Validate input with better error handling
  let validated: ListCrossReferencesInput;
  try {
    validated = listCrossReferencesParams.parse(input);
  } catch (error) {
    // Extract and format Zod validation errors for better readability
    if (error instanceof ZodError) {
      // Get first error message
      const firstError = error.errors[0];
      if (firstError) {
        throw new Error(firstError.message);
      }
    }
    throw error;
  }

  // Step 2: Call MCP to get ALL x-refs
  // MCP returns all cross-references at once (no server-side pagination)
  const raw = await callMCPTool<RawMcpResponse>('pyghidra',
    'list_cross_references',
    {
      binary_name: validated.binary_name,
      name_or_address: validated.name_or_address,
    },
    {
      // Reasonable timeout for x-ref lookups
      timeoutMs: 30000,
    }
  );

  // Step 3: Validate MCP response structure
  if (!raw.cross_references || !Array.isArray(raw.cross_references)) {
    throw new Error('Invalid MCP response: missing cross_references array');
  }

  // Debug: Check if any cross-references are missing function names
  if (process.env.DEBUG_PYGHIDRA === '1' && raw.cross_references.length > 0) {
    // Check function_name field (actual MCP field name)
    const missingFrom = raw.cross_references.filter(ref =>
      (!ref.function_name || String(ref.function_name).trim() === '' || ref.function_name === null)
    );

    if (missingFrom.length > 0) {
      console.warn(`[PyGhidra] function_name missing: ${missingFrom.length}/${raw.cross_references.length}`);
      console.warn(`[PyGhidra] Sample:`, JSON.stringify(missingFrom[0]));
    } else {
      console.log(`[PyGhidra] All ${raw.cross_references.length} xrefs have function_name populated`);
    }
  }

  // Validate each cross-reference has required fields
  for (const ref of raw.cross_references) {
    // Accept either 'type' or 'ref_type' field (PyGhidra version differences)
    const hasType = ref.ref_type || ref.type;
    if (!ref.from_address || !ref.to_address || !hasType) {
      throw new Error(
        `Invalid MCP response: cross-reference missing required fields. ` +
        `Got: ${JSON.stringify(ref)}`
      );
    }
  }

  // Step 4: Apply client-side filtering and pagination
  const response = paginateCrossRefs(
    raw.cross_references,
    validated.filter_type,
    validated.offset,
    validated.limit
  );

  // Step 5: Validate output schema
  return ListCrossReferencesOutputSchema.parse(response);
}

// =============================================================================
// Export
// =============================================================================

/**
 * Wrapper export object
 */
export const listCrossReferences = {
  name: 'pyghidra.list_cross_references',
  description: 'Lists cross-references to a function or address',
  parameters: listCrossReferencesParams,
  execute,

  tokenEstimate: {
    withoutCustomTool: 50500, // Unfiltered MCP response (500 x-refs)
    withCustomTool: 0, // At session start
    whenUsed: 5200, // Per-call estimate (default pagination: 50 x-refs)
    reduction: '90%',
  },
};
