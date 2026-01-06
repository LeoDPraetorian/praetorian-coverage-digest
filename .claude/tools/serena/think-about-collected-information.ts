/**
 * Serena think_about_collected_information wrapper
 *
 * Reflection tool for completeness of gathered information.
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

export const thinkAboutCollectedInformation = {
  name: 'serena.think_about_collected_information',
  description: 'Reflection tool for information completeness',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema> = {}): Promise<ThinkingResult> {
    const validated = InputSchema.parse(input);

    const response = await callMCPTool<string>('serena', 'think_about_collected_information', {}, {
      semanticContext: validated.semanticContext,
    });

    const prompt = typeof response === 'string' ? response : JSON.stringify(response);

    return {
      prompt,
      estimatedTokens: estimateTokens(prompt),
    };
  },
};

export default thinkAboutCollectedInformation;
