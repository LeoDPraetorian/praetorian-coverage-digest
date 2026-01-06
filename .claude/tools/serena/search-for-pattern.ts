/**
 * Serena search_for_pattern wrapper
 *
 * Searches for a pattern in project files.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoPathTraversal, validateNoControlChars } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { normalizeRelativePath } from './path-guard.js';

const InputSchema = z.object({
  /** Pattern to search for */
  pattern: z
    .string()
    .min(1, 'pattern cannot be empty')
    .refine((val) => { validateNoControlChars(val); return true; }),

  /** Directory to search in (empty for entire project) */
  relative_path: z
    .string()
    .default('')
    .refine((val) => { if (val) { validateNoPathTraversal(val); validateNoControlChars(val); } return true; }),

  /** Maximum response length (-1 for default) */
  max_answer_chars: z.number().int().default(-1),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface SearchMatch {
  file: string;
  line: number;
  content: string;
}

interface SearchForPatternResult {
  matches: SearchMatch[];
  count: number;
  pattern: string;
  estimatedTokens: number;
}

export const searchForPattern = {
  name: 'serena.search_for_pattern',
  description: 'Searches for a pattern in project files',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<SearchForPatternResult> {
    const validated = InputSchema.parse(input);

    // Normalize relative_path to strip modules/<module>/ prefix if present
    const normalizedPath = normalizeRelativePath(validated.relative_path);

    const raw = await callMCPTool<SearchMatch[]>('serena', 'search_for_pattern', {
      pattern: validated.pattern,
      relative_path: normalizedPath,
      max_answer_chars: validated.max_answer_chars,
    }, {
      semanticContext: validated.semanticContext,
    });

    const matches = Array.isArray(raw) ? raw.map(m => ({
      file: m.file || '',
      line: m.line || 0,
      content: m.content || '',
    })) : [];

    return {
      matches,
      count: matches.length,
      pattern: validated.pattern,
      estimatedTokens: estimateTokens(matches),
    };
  },
};

export default searchForPattern;
