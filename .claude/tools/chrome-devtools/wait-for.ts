// Wrapper for chrome-devtools wait_for tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  text: z.string().min(1).describe('Text to appear on page'),
  timeout: z.number().int().optional().describe('Maximum wait time in milliseconds')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const waitFor = {
  name: 'chrome-devtools.wait-for',
  description: 'Wait for text to appear on page',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',                  // MCP name
      'wait_for',  // Actual MCP tool name
      validated                           // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true };
  }
};

// Type exports
export type WaitForInput = z.infer<typeof InputSchema>;
export type WaitForOutput = z.infer<typeof OutputSchema>;
