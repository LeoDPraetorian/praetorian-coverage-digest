// Wrapper for chrome-devtools press_key tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  key: z.string().describe('Key or key combination (e.g., "Enter", "Control+A")')
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

export const pressKey = {
  name: 'chrome-devtools.press-key',
  description: 'Press a keyboard key',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',                  // MCP name
      'mcp__chrome-devtools__press_key', // Actual MCP tool name
      validated                           // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true };
  }
};

// Type exports
export type PressKeyInput = z.infer<typeof InputSchema>;
export type PressKeyOutput = z.infer<typeof OutputSchema>;
