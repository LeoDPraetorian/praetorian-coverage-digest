/**
 * Serena list_memories wrapper
 *
 * Lists all memories in project-specific store.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

const InputSchema = z.object({
  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface ListMemoriesResult {
  memories: string[];
  count: number;
}

export const listMemories = {
  name: 'serena.list_memories',
  description: 'Lists all memories in project store',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema> = {}): Promise<ListMemoriesResult> {
    const validated = InputSchema.parse(input);

    const raw = await callMCPTool<string[]>('serena', 'list_memories', {}, {
      semanticContext: validated.semanticContext,
    });

    const memories = Array.isArray(raw) ? raw : [];

    return {
      memories,
      count: memories.length,
    };
  },
};

export default listMemories;
