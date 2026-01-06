/**
 * Serena list_dir wrapper
 *
 * Lists files and directories (optionally recursive).
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoPathTraversal, validateNoControlChars } from '../config/lib/sanitize.js';
import { ensureArray } from '../config/lib/response-utils.js';
import { normalizeRelativePath } from './path-guard.js';

const InputSchema = z.object({
  /** Relative path to directory ("." for project root) */
  relative_path: z
    .string()
    .min(1, 'relative_path cannot be empty')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoControlChars, 'Invalid characters in relative_path'),

  /** Scan subdirectories recursively */
  recursive: z.boolean(),

  /** Skip gitignored files */
  skip_ignored_files: z.boolean().default(false),

  /** Maximum response length (-1 for default) */
  max_answer_chars: z.number().int().default(-1),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface ListDirResult {
  dirs: string[];
  files: string[];
  path: string;
  totalItems: number;
}

export const listDir = {
  name: 'serena.list_dir',
  description: 'Lists files and directories',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<ListDirResult> {
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    const raw = await callMCPTool<{ dirs: string[]; files: string[] }>('serena', 'list_dir', {
      relative_path: normalizedPath,
      recursive: validated.recursive,
      skip_ignored_files: validated.skip_ignored_files,
      max_answer_chars: validated.max_answer_chars,
    }, {
      semanticContext: validated.semanticContext,
    });

    // Use shared utility for safe array extraction
    const dirs = ensureArray(raw?.dirs);
    const files = ensureArray(raw?.files);

    return {
      dirs,
      files,
      path: validated.relative_path,
      totalItems: dirs.length + files.length,
    };
  },
};

export default listDir;
