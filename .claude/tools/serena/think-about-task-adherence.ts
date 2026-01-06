/**
 * Serena think_about_task_adherence wrapper
 *
 * Reflection tool for staying on track.
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

export const thinkAboutTaskAdherence = {
  name: 'serena.think_about_task_adherence',
  description: 'Reflection tool for task adherence',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema> = {}): Promise<ThinkingResult> {
    const validated = InputSchema.parse(input);

    const response = await callMCPTool<string>('serena', 'think_about_task_adherence', {}, {
      semanticContext: validated.semanticContext,
    });

    const prompt = typeof response === 'string' ? response : JSON.stringify(response);

    return {
      prompt,
      estimatedTokens: estimateTokens(prompt),
    };
  },
};

export default thinkAboutTaskAdherence;
