/**
 * Serena insert_before_symbol wrapper
 *
 * Inserts content before the beginning of a symbol's definition.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import {
  validateNoPathTraversal,
  validateNoControlChars,
} from '../config/lib/sanitize.js';
import { normalizeRelativePath } from './path-guard.js';

const InputSchema = z.object({
  /** Name path of the symbol before which to insert */
  name_path: z
    .string()
    .min(1, 'name_path cannot be empty')
    .refine(validateNoControlChars, 'Invalid characters in name_path'),

  /** Relative path to the file */
  relative_path: z
    .string()
    .min(1, 'relative_path cannot be empty')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoControlChars, 'Invalid characters in relative_path'),

  /** Content to insert */
  body: z.string().min(1, 'body cannot be empty'),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface InsertBeforeSymbolResult {
  success: boolean;
  insertedBefore: string;
  file: string;
}

export const insertBeforeSymbol = {
  name: 'serena.insert_before_symbol',
  description: 'Inserts content before a symbol definition',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<InsertBeforeSymbolResult> {
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    await callMCPTool('serena', 'insert_before_symbol', {
      name_path: validated.name_path,
      relative_path: normalizedPath,
      body: validated.body,
    }, {
      semanticContext: validated.semanticContext,
    });

    return {
      success: true,
      insertedBefore: validated.name_path,
      file: validated.relative_path,
    };
  },
};

export default insertBeforeSymbol;
