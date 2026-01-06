/**
 * Serena onboarding wrapper
 *
 * Performs project onboarding (structure identification).
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface OnboardingResult {
  instructions: string;
  estimatedTokens: number;
}

export const onboarding = {
  name: 'serena.onboarding',
  description: 'Performs project onboarding',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema> = {}): Promise<OnboardingResult> {
    const validated = InputSchema.parse(input);

    const response = await callMCPTool<string>('serena', 'onboarding', {}, {
      semanticContext: validated.semanticContext,
    });

    const instructions = typeof response === 'string' ? response : JSON.stringify(response);

    return {
      instructions,
      estimatedTokens: estimateTokens(instructions),
    };
  },
};

export default onboarding;
