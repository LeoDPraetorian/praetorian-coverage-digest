/**
 * Serena find_referencing_symbols wrapper
 *
 * Finds symbols that reference a given symbol.
 * Useful for understanding code dependencies and impact of changes.
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
  /** Name path of the symbol to find references for */
  name_path: z
    .string()
    .min(1, 'name_path cannot be empty')
    .refine(
      (val) => {
        validateNoControlChars(val);
        return true;
      },
      { message: 'Invalid characters in name_path' }
    ),

  /** Relative path to the file containing the symbol */
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

  /** LSP symbol kinds to include */
  include_kinds: z.array(z.number().int().min(1).max(26)).default([]),

  /** LSP symbol kinds to exclude */
  exclude_kinds: z.array(z.number().int().min(1).max(26)).default([]),

  /** Maximum characters in response */
  max_answer_chars: z.number().int().default(-1),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface Reference {
  name_path: string;
  kind: number;
  kindName: string;
  relative_path: string;
  content_around_reference: string;
}

interface FindReferencingSymbolsResult {
  references: Reference[];
  count: number;
  targetSymbol: string;
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

export const findReferencingSymbols = {
  name: 'serena.find_referencing_symbols',
  description: 'Finds symbols that reference a given symbol',
  inputSchema: InputSchema,

  async execute(
    input: z.infer<typeof InputSchema>
  ): Promise<FindReferencingSymbolsResult> {
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    const raw = await callMCPTool<any[]>('serena', 'find_referencing_symbols', {
      name_path: validated.name_path,
      relative_path: normalizedPath,
      include_kinds: validated.include_kinds,
      exclude_kinds: validated.exclude_kinds,
      max_answer_chars: validated.max_answer_chars,
    }, {
      semanticContext: validated.semanticContext,
    });

    if (!Array.isArray(raw)) {
      throw new Error('Invalid response from MCP: expected array of references');
    }

    const references: Reference[] = raw.map((ref) => ({
      name_path: ref.name_path,
      kind: ref.kind,
      kindName: getKindName(ref.kind),
      relative_path: ref.relative_path,
      content_around_reference: ref.content_around_reference || '',
    }));

    return {
      references,
      count: references.length,
      targetSymbol: validated.name_path,
      estimatedTokens: estimateTokens(references),
    };
  },
};

export default findReferencingSymbols;
