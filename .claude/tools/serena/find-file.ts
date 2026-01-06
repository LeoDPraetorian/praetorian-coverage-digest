/**
 * Serena find_file wrapper
 *
 * Finds files matching a pattern within a directory.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoPathTraversal, validateNoControlChars } from '../config/lib/sanitize.js';
import { normalizeRelativePath } from './path-guard.js';

const InputSchema = z.object({
  /** Filename or pattern (* and ? wildcards) */
  file_mask: z
    .string()
    .min(1, 'file_mask cannot be empty')
    .refine(validateNoControlChars, 'Invalid characters in file_mask'),

  /** Directory to search in ("." for project root) */
  relative_path: z
    .string()
    .min(1, 'relative_path cannot be empty')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoControlChars, 'Invalid characters in relative_path'),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface FindFileResult {
  files: string[];
  count: number;
  pattern: string;
  searchPath: string;
}

export const findFile = {
  name: 'serena.find_file',
  description: 'Finds files matching a pattern',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<FindFileResult> {
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    const raw = await callMCPTool<{ files: string[] }>('serena', 'find_file', {
      file_mask: validated.file_mask,
      relative_path: normalizedPath,
    }, {
      semanticContext: validated.semanticContext,
    });

    const files = Array.isArray(raw?.files) ? raw.files : [];

    return {
      files,
      count: files.length,
      pattern: validated.file_mask,
      searchPath: validated.relative_path,
    };
  },
};

export default findFile;
