/**
 * Serena get_current_config wrapper
 *
 * Returns current agent configuration.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface GetCurrentConfigResult {
  config: any;
  estimatedTokens: number;
}

export const getCurrentConfig = {
  name: 'serena.get_current_config',
  description: 'Returns current agent configuration',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema> = {}): Promise<GetCurrentConfigResult> {
    const validated = InputSchema.parse(input);

    const response = await callMCPTool<any>('serena', 'get_current_config', {}, {
      semanticContext: validated.semanticContext,
    });

    const configStr = typeof response === 'string' ? response : JSON.stringify(response);

    return {
      config: response,
      estimatedTokens: estimateTokens(configStr),
    };
  },
};

export default getCurrentConfig;
