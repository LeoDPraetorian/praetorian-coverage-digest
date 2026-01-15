/**
 * Ghydra MCP Wrapper: instances-use
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { GhydraWrapperError } from './errors.js';

export const InputSchema = z.object({
  port: z.number().int({ message: 'Port must be an integer' }).min(1, { message: 'Port must be at least 1' }).max(65535, { message: 'Port must be at most 65535' }).describe('Port number of the Ghidra instance to set as active'),
});

export type InstancesUseInput = z.infer<typeof InputSchema>;

export interface InstancesUseOutput {
  success: boolean;
  port: number;
  operation: 'activated';
  timestamp: string;
  estimatedTokens: number;
}

function filterResponse(raw: unknown, inputPort: number): InstancesUseOutput {
  const result: InstancesUseOutput = { success: true, port: inputPort, operation: 'activated', timestamp: new Date().toISOString(), estimatedTokens: 0 };
  result.estimatedTokens = estimateTokens(result);
  return result;
}

export const instancesUse = {
  name: 'ghydra.instances_use',
  description: 'Set the active Ghidra instance by port number. All subsequent operations will target this instance.',
  inputSchema: InputSchema,

  async execute(input: InstancesUseInput): Promise<InstancesUseOutput> {
    const validated = InputSchema.parse(input);
    try {
      const raw = await callMCPTool('ghydra', 'instances_use', { port: validated.port });
      return filterResponse(raw, validated.port);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.match(/not (found|registered)|unknown instance/i)) {
          throw new GhydraWrapperError({ type: 'not_found', message: `Instance on port ${validated.port} not registered. Use instances-list to see available instances or instances-register to add one.`, retryable: false }, 'instances-use', { port: validated.port });
        }
        if (error.message.match(/connection|timeout|ECONNREFUSED/i)) {
          throw new GhydraWrapperError({ type: 'connection', message: `Cannot connect to instance on port ${validated.port}. Ensure Ghidra is running with the GhidraBridge plugin.`, retryable: true }, 'instances-use', { port: validated.port });
        }
      }
      throw error;
    }
  },
};

export default instancesUse;
