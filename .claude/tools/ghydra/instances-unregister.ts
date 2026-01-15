/**
 * Ghydra instances-unregister wrapper
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { GhydraWrapperError } from './errors.js';

const InputSchema = z.object({
  port: z.number().int('Port must be an integer').min(1, 'Port must be positive').max(65535, 'Port must be <= 65535').describe('Port of the Ghidra instance to unregister (required)'),
});

export type InstancesUnregisterInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  success: z.boolean(),
  port: z.number(),
  operation: z.literal('unregistered'),
  timestamp: z.string(),
  estimatedTokens: z.number(),
});

export type InstancesUnregisterOutput = z.infer<typeof OutputSchema>;

function filterResponse(raw: any, inputPort: number): InstancesUnregisterOutput {
  const result = { success: raw?.success === true, port: inputPort, operation: 'unregistered' as const, timestamp: new Date().toISOString() };
  return { ...result, estimatedTokens: estimateTokens(result) };
}

function handleError(error: any, port: number): never {
  const errorMsg = error?.message || String(error);
  if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('refused')) {
    throw new GhydraWrapperError({ type: 'connection', message: `Failed to connect to Ghidra instance on port ${port}`, retryable: true }, 'instances-unregister', { port });
  }
  if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
    throw new GhydraWrapperError({ type: 'timeout', message: `Operation timed out for port ${port}`, retryable: true }, 'instances-unregister', { port });
  }
  if (errorMsg.includes('currently active') || errorMsg.includes('in use')) {
    throw new GhydraWrapperError({ type: 'operation', message: `Cannot unregister port ${port}: instance is currently active. Use 'instances-use' to switch first.`, retryable: false }, 'instances-unregister', { port });
  }
  if (errorMsg.includes('not found') || errorMsg.includes('not registered')) {
    throw new GhydraWrapperError({ type: 'not_found', message: `No instance registered on port ${port}`, retryable: false }, 'instances-unregister', { port });
  }
  throw new GhydraWrapperError({ type: 'operation', message: `Failed to unregister instance on port ${port}`, retryable: false }, 'instances-unregister', { port });
}

export const instancesUnregister = {
  name: 'ghydra.instances_unregister' as const,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: InstancesUnregisterInput): Promise<InstancesUnregisterOutput> {
    const validated = InputSchema.parse(input);
    try {
      const raw = await callMCPTool('ghydra', 'instances_unregister', { port: validated.port });
      if (raw?.success === false && (raw?.message?.includes('not registered') || raw?.message?.includes('already'))) {
        return { success: true, port: validated.port, operation: 'unregistered', timestamp: new Date().toISOString(), estimatedTokens: estimateTokens({ success: true, port: validated.port, operation: 'unregistered' }) };
      }
      if (raw === null || raw === undefined) {
        throw new Error('Malformed response from MCP server');
      }
      return filterResponse(raw, validated.port);
    } catch (error) {
      if (error instanceof GhydraWrapperError) throw error;
      handleError(error, validated.port);
    }
  },
};

export default instancesUnregister;
