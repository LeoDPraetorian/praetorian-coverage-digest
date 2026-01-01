// Wrapper for chrome-devtools handle_dialog tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  action: z.enum(['accept', 'dismiss']).describe('Whether to dismiss or accept the dialog'),
  promptText: z.string().optional().describe('Optional prompt text to enter')
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

export const handleDialog = {
  name: 'chrome-devtools.handle-dialog',
  description: 'Handle a browser dialog',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',                      // MCP name
      'handle_dialog', // Actual MCP tool name
      validated                               // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true };
  }
};

// Type exports
export type HandleDialogInput = z.infer<typeof InputSchema>;
export type HandleDialogOutput = z.infer<typeof OutputSchema>;
