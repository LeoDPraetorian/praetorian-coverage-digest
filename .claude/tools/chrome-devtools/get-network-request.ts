// Wrapper for chrome-devtools get_network_request tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { estimateTokens } from '../config/lib/response-utils.js';
// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================
const InputSchema = z.object({
  reqid: z.number().optional().describe('The reqid of the network request')
});
// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================
const OutputSchema = z.object({
  success: z.boolean(),
  request: z.any().optional(),
  estimatedTokens: z.number()
});
// ============================================================================
// Tool Wrapper
// ============================================================================
export const getNetworkRequest = {
  name: 'chrome-devtools.get-network-request',
  description: 'Get a network request by ID',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);
    // Call chrome-devtools MCP server via SHARED client
    const request = await callMCPTool(
      'chrome-devtools',                            // MCP name
      'get_network_request', // Actual MCP tool name
      validated                                     // Pass params directly
    );
    // Return filtered result (token efficient)
    const output = { success: true, request };
    return { ...output, estimatedTokens: estimateTokens(output) };
  }
};
// Type exports
export type GetNetworkRequestInput = z.infer<typeof InputSchema>;
export type GetNetworkRequestOutput = z.infer<typeof OutputSchema>;
