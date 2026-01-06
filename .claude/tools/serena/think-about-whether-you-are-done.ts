/**
 * Serena think_about_whether_you_are_done wrapper
 *
 * Reflection tool for task completion.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface ThinkingResult {
  prompt: string;
  estimatedTokens: number;
}

export const thinkAboutWhetherYouAreDone = {
  name: 'serena.think_about_whether_you_are_done',
  description: 'Reflection tool for task completion',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema> = {}): Promise<ThinkingResult> {
    const validated = InputSchema.parse(input);

    const response = await callMCPTool<string>('serena', 'think_about_whether_you_are_done', {}, {
      semanticContext: validated.semanticContext,
    });

    const prompt = typeof response === 'string' ? response : JSON.stringify(response);

    return {
      prompt,
      estimatedTokens: estimateTokens(prompt),
    };
  },
};

export default thinkAboutWhetherYouAreDone;
