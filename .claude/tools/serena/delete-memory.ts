/**
 * Serena delete_memory wrapper
 *
 * Deletes a memory from project-specific store.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoControlChars } from '../config/lib/sanitize.js';

const InputSchema = z.object({
  /** Memory name to delete */
  memory_file_name: z
    .string()
    .min(1, 'memory_file_name cannot be empty')
    .refine((val) => { validateNoControlChars(val); return true; }),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface DeleteMemoryResult {
  success: boolean;
  deleted: string;
}

export const deleteMemory = {
  name: 'serena.delete_memory',
  description: 'Deletes a memory from project store',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<DeleteMemoryResult> {
    const validated = InputSchema.parse(input);

    await callMCPTool('serena', 'delete_memory', {
      memory_file_name: validated.memory_file_name,
    }, {
      semanticContext: validated.semanticContext,
    });

    return {
      success: true,
      deleted: validated.memory_file_name,
    };
  },
};

export default deleteMemory;
