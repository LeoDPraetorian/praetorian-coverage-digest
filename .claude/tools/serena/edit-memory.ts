/**
 * Serena edit_memory wrapper
 *
 * Edits content in a memory using literal or regex replacement.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoControlChars } from '../config/lib/sanitize.js';

const InputSchema = z.object({
  /** Memory name to edit */
  memory_file_name: z
    .string()
    .min(1, 'memory_file_name cannot be empty')
    .refine((val) => { validateNoControlChars(val); return true; }),

  /** String or regex pattern to search for */
  needle: z.string().min(1, 'needle cannot be empty'),

  /** Replacement string */
  repl: z.string(),

  /** Matching mode: "literal" or "regex" */
  mode: z.enum(['literal', 'regex']),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface EditMemoryResult {
  success: boolean;
  name: string;
  mode: string;
}

export const editMemory = {
  name: 'serena.edit_memory',
  description: 'Edits content in a memory using literal or regex replacement',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<EditMemoryResult> {
    const validated = InputSchema.parse(input);

    await callMCPTool('serena', 'edit_memory', {
      memory_file_name: validated.memory_file_name,
      needle: validated.needle,
      repl: validated.repl,
      mode: validated.mode,
    }, {
      semanticContext: validated.semanticContext,
    });

    return {
      success: true,
      name: validated.memory_file_name,
      mode: validated.mode,
    };
  },
};

export default editMemory;
