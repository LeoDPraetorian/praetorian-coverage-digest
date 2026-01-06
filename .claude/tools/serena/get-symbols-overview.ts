/**
 * Serena get_symbols_overview wrapper
 *
 * Gets an overview of top-level symbols defined in a file.
 * First tool to call when understanding a new file.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import {
  validateNoPathTraversal,
  validateNoControlChars,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { normalizeRelativePath } from './path-guard.js';

const InputSchema = z.object({
  /** Relative path to the file */
  relative_path: z
    .string()
    .min(1, 'relative_path cannot be empty')
    .refine(
      (val) => {
        validateNoPathTraversal(val);
        validateNoControlChars(val);
        return true;
      },
      { message: 'Invalid characters in relative_path' }
    ),

  /** Depth for descendants (0 = top-level only, 1 = immediate children) */
  depth: z.number().int().min(0).default(0),

  /** Maximum characters in response (-1 for default) */
  max_answer_chars: z.number().int().default(-1),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface SymbolOverview {
  name: string;
  kind: number;
  kindName: string;
  children?: SymbolOverview[];
}

interface GetSymbolsOverviewResult {
  symbols: SymbolOverview[];
  count: number;
  file: string;
  estimatedTokens: number;
}

function getKindName(kind: number): string {
  const names: Record<number, string> = {
    1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
    6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
    11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant',
    15: 'String', 16: 'Number', 17: 'Boolean', 18: 'Array', 19: 'Object',
    20: 'Key', 21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event',
    25: 'Operator', 26: 'TypeParameter',
  };
  return names[kind] || 'Unknown';
}

function mapSymbol(raw: any): SymbolOverview {
  const result: SymbolOverview = {
    name: raw.name,
    kind: raw.kind,
    kindName: getKindName(raw.kind),
  };
  if (raw.children && Array.isArray(raw.children)) {
    result.children = raw.children.map(mapSymbol);
  }
  return result;
}

export const getSymbolsOverview = {
  name: 'serena.get_symbols_overview',
  description: 'Gets overview of top-level symbols in a file',
  inputSchema: InputSchema,

  async execute(
    input: z.infer<typeof InputSchema>
  ): Promise<GetSymbolsOverviewResult> {
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    const raw = await callMCPTool<any[]>('serena', 'get_symbols_overview', {
      relative_path: normalizedPath,
      depth: validated.depth,
      max_answer_chars: validated.max_answer_chars,
    }, {
      semanticContext: validated.semanticContext,
    });

    if (!Array.isArray(raw)) {
      throw new Error('Invalid response from MCP: expected array of symbols');
    }

    const symbols = raw.map(mapSymbol);

    return {
      symbols,
      count: symbols.length,
      file: validated.relative_path,
      estimatedTokens: estimateTokens(symbols),
    };
  },
};

export default getSymbolsOverview;
