/**
 * Serena read_memory wrapper
 *
 * Reads named memory from project-specific store.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoControlChars } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  /** Memory name to read */
  memory_file_name: z
    .string()
    .min(1, 'memory_file_name cannot be empty')
    .refine((val) => { validateNoControlChars(val); return true; }),

  /** Maximum response length (-1 for default) */
  max_answer_chars: z.number().int().default(-1),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface ReadMemoryResult {
  content: string;
  name: string;
  size: number;
  estimatedTokens: number;
}

export const readMemory = {
  name: 'serena.read_memory',
  description: 'Reads named memory from project store',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<ReadMemoryResult> {
    const validated = InputSchema.parse(input);

    const content = await callMCPTool<string>('serena', 'read_memory', {
      memory_file_name: validated.memory_file_name,
      max_answer_chars: validated.max_answer_chars,
    }, {
      semanticContext: validated.semanticContext,
    });

    const finalContent = typeof content === 'string' ? content : JSON.stringify(content);

    return {
      content: finalContent,
      name: validated.memory_file_name,
      size: finalContent.length,
      estimatedTokens: estimateTokens(finalContent),
    };
  },
};

export default readMemory;
