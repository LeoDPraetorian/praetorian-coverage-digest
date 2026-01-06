/**
 * Serena find_symbol wrapper
 *
 * Performs global or local semantic symbol search using language server.
 * Returns filtered symbol information for token efficiency.
 *
 * @example
 * ```typescript
 * import { findSymbol } from './.claude/tools/serena/find-symbol';
 *
 * // Simple search
 * const result = await findSymbol.execute({
 *   name_path_pattern: 'MyClass/myMethod',
 * });
 *
 * // Search with options
 * const result = await findSymbol.execute({
 *   name_path_pattern: 'get',
 *   relative_path: 'src/',
 *   include_kinds: [6, 12], // Method, Function
 *   substring_matching: true,
 *   depth: 1,
 * });
 * ```
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import {
  validateNoPathTraversal,
  validateNoControlChars,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { normalizeRelativePath } from './path-guard.js';

/**
 * LSP Symbol Kinds for filtering
 * Reference: https://microsoft.github.io/language-server-protocol/specifications/specification-current/#symbolKind
 */
export const SymbolKind = {
  File: 1,
  Module: 2,
  Namespace: 3,
  Package: 4,
  Class: 5,
  Method: 6,
  Property: 7,
  Field: 8,
  Constructor: 9,
  Enum: 10,
  Interface: 11,
  Function: 12,
  Variable: 13,
  Constant: 14,
  String: 15,
  Number: 16,
  Boolean: 17,
  Array: 18,
  Object: 19,
  Key: 20,
  Null: 21,
  EnumMember: 22,
  Struct: 23,
  Event: 24,
  Operator: 25,
  TypeParameter: 26,
} as const;

/**
 * Input validation schema
 */
const InputSchema = z.object({
  /**
   * Name path pattern to search for.
   * Can be:
   * - Simple name: "method" (matches any symbol with that name)
   * - Relative path: "class/method" (matches suffix)
   * - Absolute path: "/class/method" (exact match)
   */
  name_path_pattern: z
    .string()
    .min(1, 'name_path_pattern cannot be empty')
    .refine(
      (val) => {
        validateNoPathTraversal(val);
        validateNoControlChars(val);
        return true;
      },
      { message: 'Invalid characters in name_path_pattern' }
    ),

  /**
   * Depth up to which descendants shall be retrieved.
   * 0 = only matching symbols
   * 1 = immediate children (e.g., methods of a class)
   */
  depth: z.number().int().min(0).default(0),

  /**
   * Restrict search to this file or directory.
   * Empty string searches entire codebase.
   */
  relative_path: z
    .string()
    .default('')
    .refine(
      (val) => {
        if (val) {
          validateNoPathTraversal(val);
          validateNoControlChars(val);
        }
        return true;
      },
      { message: 'Invalid characters in relative_path' }
    ),

  /**
   * Include symbol source code in results.
   * Use judiciously - increases token usage.
   */
  include_body: z.boolean().default(false),

  /**
   * LSP symbol kinds to include (e.g., [5, 12] for Class, Function).
   * Empty array includes all kinds.
   */
  include_kinds: z.array(z.number().int().min(1).max(26)).default([]),

  /**
   * LSP symbol kinds to exclude. Takes precedence over include_kinds.
   */
  exclude_kinds: z.array(z.number().int().min(1).max(26)).default([]),

  /**
   * Enable substring matching for the last element of the pattern.
   * "Foo/get" would match "Foo/getValue" and "Foo/getData".
   */
  substring_matching: z.boolean().default(false),

  /**
   * Maximum characters in response. -1 for default.
   */
  max_answer_chars: z.number().int().default(-1),

  /**
   * Semantic context for module routing in super-repos.
   * Describes what you're looking for to route to the correct module.
   * Example: "Find Asset class in React frontend"
   */
  semanticContext: z.string().optional(),
});

/**
 * Symbol location information
 */
interface SymbolLocation {
  start_line: number;
  end_line: number;
}

/**
 * Filtered symbol result
 */
interface FilteredSymbol {
  /** Full name path (e.g., "MyClass/myMethod") */
  name_path: string;
  /** LSP symbol kind */
  kind: number;
  /** Human-readable kind name */
  kindName: string;
  /** File path relative to project root */
  relative_path: string;
  /** Line number range */
  location: SymbolLocation;
  /** Source code (only if include_body=true) */
  body?: string;
}

/**
 * Wrapper output
 */
interface FindSymbolResult {
  /** Matching symbols */
  symbols: FilteredSymbol[];
  /** Number of matches */
  count: number;
  /** Estimated token count */
  estimatedTokens: number;
}

/**
 * Get human-readable name for symbol kind
 */
function getKindName(kind: number): string {
  const names: Record<number, string> = {
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
    19: 'Object',
    20: 'Key',
    21: 'Null',
    22: 'EnumMember',
    23: 'Struct',
    24: 'Event',
    25: 'Operator',
    26: 'TypeParameter',
  };
  return names[kind] || 'Unknown';
}

/**
 * Filter raw MCP response to essential fields
 */
function filterSymbol(raw: any): FilteredSymbol {
  return {
    name_path: raw.name_path,
    kind: raw.kind,
    kindName: getKindName(raw.kind),
    relative_path: raw.relative_path,
    location: {
      start_line: raw.body_location?.start_line ?? 0,
      end_line: raw.body_location?.end_line ?? 0,
    },
    ...(raw.body ? { body: raw.body } : {}),
  };
}

/**
 * Find symbols wrapper
 */
export const findSymbol = {
  name: 'serena.find_symbol',
  description: 'Performs semantic symbol search using language server',
  inputSchema: InputSchema,

  async execute(
    input: z.infer<typeof InputSchema>
  ): Promise<FindSymbolResult> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    // This prevents path doubling when Serena is already scoped to a module
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    // Call MCP with semantic routing
    const raw = await callMCPTool<any[]>('serena', 'find_symbol', {
      name_path_pattern: validated.name_path_pattern,
      depth: validated.depth,
      relative_path: normalizedPath,
      include_body: validated.include_body,
      include_kinds: validated.include_kinds,
      exclude_kinds: validated.exclude_kinds,
      substring_matching: validated.substring_matching,
      max_answer_chars: validated.max_answer_chars,
    }, {
      semanticContext: validated.semanticContext,
    });

    // Handle non-array response
    if (!Array.isArray(raw)) {
      throw new Error('Invalid response from MCP: expected array of symbols');
    }

    // Filter response for token efficiency
    const symbols = raw.map(filterSymbol);

    return {
      symbols,
      count: symbols.length,
      estimatedTokens: estimateTokens(symbols),
    };
  },
};

export type { FilteredSymbol, FindSymbolResult };
export default findSymbol;
