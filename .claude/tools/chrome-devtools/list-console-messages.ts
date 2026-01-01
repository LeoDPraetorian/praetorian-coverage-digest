// Wrapper for chrome-devtools list_console_messages tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  includePreservedMessages: z.boolean().optional().default(false),
  pageIdx: z.number().int().min(0).optional(),
  pageSize: z.number().int().optional(),
  types: z.array(z.enum(['log', 'debug', 'info', 'error', 'warn', 'dir', 'dirxml', 'table', 'trace', 'clear', 'startGroup', 'startGroupCollapsed', 'endGroup', 'assert', 'profile', 'profileEnd', 'count', 'timeEnd', 'verbose', 'issue'])).optional()
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  messages: z.array(z.any()).optional()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const listConsoleMessages = {
  name: 'chrome-devtools.list-console-messages',
  description: 'List all console messages',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const messages = await callMCPTool(
      'chrome-devtools',                               // MCP name
      'list_console_messages',  // Actual MCP tool name
      validated                                        // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true, messages };
  }
};

// Type exports
export type ListConsoleMessagesInput = z.infer<typeof InputSchema>;
export type ListConsoleMessagesOutput = z.infer<typeof OutputSchema>;
