// Wrapper for chrome-devtools drag tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  from_uid: z.string().describe('The uid of the element to drag'),
  to_uid: z.string().describe('The uid of the element to drop into')
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

export const drag = {
  name: 'chrome-devtools.drag',
  description: 'Drag an element onto another element',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',            // MCP name
      'mcp__chrome-devtools__drag', // Actual MCP tool name
      validated                      // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true };
  }
};

// Type exports
export type DragInput = z.infer<typeof InputSchema>;
export type DragOutput = z.infer<typeof OutputSchema>;
