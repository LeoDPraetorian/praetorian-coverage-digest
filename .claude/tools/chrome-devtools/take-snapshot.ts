// Wrapper for chrome-devtools take_snapshot tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  filePath: z.string().optional().describe('Path to save snapshot'),
  verbose: z.boolean().optional().describe('Include full a11y tree info')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  snapshot: z.string().optional()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const takeSnapshot = {
  name: 'chrome-devtools.take-snapshot',
  description: 'Take a text snapshot of the page',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const snapshot = await callMCPTool(
      'chrome-devtools',                      // MCP name
      'mcp__chrome-devtools__take_snapshot', // Actual MCP tool name
      validated                               // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true, snapshot };
  }
};

// Type exports
export type TakeSnapshotInput = z.infer<typeof InputSchema>;
export type TakeSnapshotOutput = z.infer<typeof OutputSchema>;
