/**
 * Serena replace_symbol_body wrapper
 *
 * Replaces the full definition of a symbol (function, class, method, etc.)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import {
  validateNoPathTraversal,
  validateNoControlChars,
} from '../config/lib/sanitize.js';
import { normalizeRelativePath } from './path-guard.js';

const InputSchema = z.object({
  /** Name path of the symbol to replace */
  name_path: z
    .string()
    .min(1, 'name_path cannot be empty')
    .refine(validateNoControlChars, 'Invalid characters in name_path'),

  /** Relative path to the file containing the symbol */
  relative_path: z
    .string()
    .min(1, 'relative_path cannot be empty')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoControlChars, 'Invalid characters in relative_path'),

  /** New symbol body (complete definition including signature) */
  body: z.string().min(1, 'body cannot be empty'),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface ReplaceSymbolBodyResult {
  success: boolean;
  symbol: string;
  file: string;
}

export const replaceSymbolBody = {
  name: 'serena.replace_symbol_body',
  description: 'Replaces the full definition of a symbol',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<ReplaceSymbolBodyResult> {
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    await callMCPTool('serena', 'replace_symbol_body', {
      name_path: validated.name_path,
      relative_path: normalizedPath,
      body: validated.body,
    }, {
      semanticContext: validated.semanticContext,
    });

    return {
      success: true,
      symbol: validated.name_path,
      file: validated.relative_path,
    };
  },
};

export default replaceSymbolBody;
