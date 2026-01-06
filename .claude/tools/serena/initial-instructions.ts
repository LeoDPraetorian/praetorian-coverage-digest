/**
 * Serena initial_instructions wrapper
 *
 * Returns Serena instructions manual.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface InitialInstructionsResult {
  instructions: string;
  estimatedTokens: number;
}

export const initialInstructions = {
  name: 'serena.initial_instructions',
  description: 'Returns Serena instructions manual',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema> = {}): Promise<InitialInstructionsResult> {
    const validated = InputSchema.parse(input);

    const response = await callMCPTool<string>('serena', 'initial_instructions', {}, {
      semanticContext: validated.semanticContext,
    });

    const instructions = typeof response === 'string' ? response : JSON.stringify(response);

    return {
      instructions,
      estimatedTokens: estimateTokens(instructions),
    };
  },
};

export default initialInstructions;
