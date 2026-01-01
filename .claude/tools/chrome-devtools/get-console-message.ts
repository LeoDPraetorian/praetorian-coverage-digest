// Wrapper for chrome-devtools get_console_message tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  msgid: z.number().describe('The msgid of a console message')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  message: z.any().optional()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const getConsoleMessage = {
  name: 'chrome-devtools.get-console-message',
  description: 'Get a specific console message by ID',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const message = await callMCPTool(
      'chrome-devtools',                            // MCP name
      'get_console_message', // Actual MCP tool name
      validated                                     // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true, message };
  }
};

// Type exports
export type GetConsoleMessageInput = z.infer<typeof InputSchema>;
export type GetConsoleMessageOutput = z.infer<typeof OutputSchema>;
