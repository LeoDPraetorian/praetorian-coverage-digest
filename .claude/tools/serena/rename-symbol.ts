/**
 * Serena rename_symbol wrapper
 *
 * Renames a symbol throughout the codebase using language server refactoring.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import {
  validateNoPathTraversal,
  validateNoControlChars,
} from '../config/lib/sanitize.js';
import { normalizeRelativePath } from './path-guard.js';

const InputSchema = z.object({
  /** Name path of the symbol to rename */
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

  /** New name for the symbol */
  new_name: z
    .string()
    .min(1, 'new_name cannot be empty')
    .refine(validateNoControlChars, 'Invalid characters in new_name'),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface RenameSymbolResult {
  success: boolean;
  oldName: string;
  newName: string;
  file: string;
}

export const renameSymbol = {
  name: 'serena.rename_symbol',
  description: 'Renames a symbol throughout the codebase',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<RenameSymbolResult> {
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    await callMCPTool('serena', 'rename_symbol', {
      name_path: validated.name_path,
      relative_path: normalizedPath,
      new_name: validated.new_name,
    }, {
      semanticContext: validated.semanticContext,
    });

    return {
      success: true,
      oldName: validated.name_path,
      newName: validated.new_name,
      file: validated.relative_path,
    };
  },
};

export default renameSymbol;
