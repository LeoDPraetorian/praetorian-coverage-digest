/**
 * Ghydra MCP Wrapper: instances-register
 *
 * Register a new Ghidra instance for use with ghydra MCP server.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { validateNoControlChars, validateNoXSS, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';

const RequiredPortSchema = z.number()
  .int({ message: 'Port must be an integer' })
  .min(1, { message: 'Port must be at least 1' })
  .max(65535, { message: 'Port must be at most 65535' })
  .describe('Ghidra instance port (required for registration)');

const GhydraURLSchema = z.string()
  .url({ message: 'Must be a valid URL' })
  .max(2048, { message: 'URL too long (max 2048 chars)' })
  .refine((val) => /^(https?|wss?):\/\//.test(val), { message: 'URL must use http, https, ws, or wss protocol' })
  .refine((val) => validateNoControlChars(val), { message: 'Control characters not allowed in URL' })
  .refine((val) => validateNoXSS(val), { message: 'Invalid characters in URL' })
  .refine((val) => validateNoPathTraversal(val), { message: 'Path traversal not allowed in URL' })
  .refine((val) => validateNoCommandInjection(val), { message: 'Command injection patterns not allowed in URL' })
  .optional()
  .describe('Optional URL for the Ghidra instance (default: http://localhost:{port})');

const InputSchema = z.object({
  port: RequiredPortSchema,
  url: GhydraURLSchema,
});

const OutputSchema = z.object({
  success: z.boolean(),
  port: z.number(),
  url: z.string().optional(),
  operation: z.literal('registered'),
  timestamp: z.string(),
  estimatedTokens: z.number(),
});

type InstancesRegisterOutput = z.infer<typeof OutputSchema>;

function filterResponse(raw: any, input: z.infer<typeof InputSchema>): InstancesRegisterOutput {
  const result = {
    success: raw.success ?? true,
    port: input.port,
    ...(input.url && { url: input.url }),
    operation: 'registered' as const,
    timestamp: raw.timestamp ?? new Date().toISOString(),
  };
  return { ...result, estimatedTokens: estimateTokens(result) };
}

function buildSuccessResponse(input: z.infer<typeof InputSchema>): InstancesRegisterOutput {
  const result = {
    success: true,
    port: input.port,
    ...(input.url && { url: input.url }),
    operation: 'registered' as const,
    timestamp: new Date().toISOString(),
  };
  return { ...result, estimatedTokens: estimateTokens(result) };
}

export const instancesRegister = {
  name: 'ghydra.instances_register',
  description: 'Register a new Ghidra instance for use with ghydra MCP',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<InstancesRegisterOutput> {
    const validated = InputSchema.parse(input);
    const mcpParams = { port: validated.port, ...(validated.url && { url: validated.url }) };
    try {
      const raw = await callMCPTool('ghydra', 'instances_register', mcpParams);
      return filterResponse(raw, validated);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('already registered')) {
        return buildSuccessResponse(validated);
      }
      throw error;
    }
  },
};

export type InstancesRegisterInput = z.infer<typeof InputSchema>;
export type { InstancesRegisterOutput };
export default instancesRegister;
