/**
 * Serena write_memory wrapper
 *
 * Writes named memory to project-specific store for future reference.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoControlChars } from '../config/lib/sanitize.js';

const InputSchema = z.object({
  /** Memory name (should be meaningful) */
  memory_file_name: z
    .string()
    .min(1, 'memory_file_name cannot be empty')
    .refine((val) => { validateNoControlChars(val); return true; }),

  /** Content to store (UTF-8) */
  content: z.string().min(1, 'content cannot be empty'),

  /** Maximum content length (-1 for default) */
  max_answer_chars: z.number().int().default(-1),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface WriteMemoryResult {
  success: boolean;
  name: string;
  size: number;
}

export const writeMemory = {
  name: 'serena.write_memory',
  description: 'Writes named memory to project store',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<WriteMemoryResult> {
    const validated = InputSchema.parse(input);

    await callMCPTool('serena', 'write_memory', {
      memory_file_name: validated.memory_file_name,
      content: validated.content,
      max_answer_chars: validated.max_answer_chars,
    }, {
      semanticContext: validated.semanticContext,
    });

    return {
      success: true,
      name: validated.memory_file_name,
      size: validated.content.length,
    };
  },
};

export default writeMemory;
