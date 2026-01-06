/**
 * Serena check_onboarding_performed wrapper
 *
 * Checks if project onboarding was completed.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

const InputSchema = z.object({
  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface CheckOnboardingResult {
  performed: boolean;
  message: string;
  memories: string[];
}

export const checkOnboardingPerformed = {
  name: 'serena.check_onboarding_performed',
  description: 'Checks if project onboarding was completed',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema> = {}): Promise<CheckOnboardingResult> {
    const validated = InputSchema.parse(input);

    const response = await callMCPTool<string>('serena', 'check_onboarding_performed', {}, {
      semanticContext: validated.semanticContext,
    });

    const responseStr = typeof response === 'string' ? response : JSON.stringify(response);
    const performed = !responseStr.toLowerCase().includes('not performed');

    // Extract memory list if present
    const memoryMatch = responseStr.match(/\[([^\]]*)\]/);
    const memories = memoryMatch ? memoryMatch[1].split(',').map(m => m.trim().replace(/['"]/g, '')).filter(Boolean) : [];

    return {
      performed,
      message: responseStr,
      memories,
    };
  },
};

export default checkOnboardingPerformed;
