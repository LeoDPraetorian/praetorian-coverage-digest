// Wrapper for chrome-devtools click tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { estimateTokens } from '../config/lib/response-utils.js';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  uid: z.string().describe('The uid of an element from the page snapshot'),
  dblClick: z.boolean().optional().describe('Set to true for double clicks')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  estimatedTokens: z.number()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const click = {
  name: 'chrome-devtools.click',
  description: 'Click an element on the page',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',                // MCP name
      'click',    // Actual MCP tool name
      validated                          // Pass params directly
    );

    // Return filtered result (token efficient)
    const result = { success: true };
    return { ...result, estimatedTokens: estimateTokens(result) };
  }
};

// Type exports
export type ClickInput = z.infer<typeof InputSchema>;
export type ClickOutput = z.infer<typeof OutputSchema>;
