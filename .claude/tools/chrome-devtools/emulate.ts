// Wrapper for chrome-devtools emulate tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  cpuThrottlingRate: z.number().min(1).max(20).optional().describe('CPU slowdown factor (1 = disabled)'),
  networkConditions: z.enum(['No emulation', 'Offline', 'Slow 3G', 'Fast 3G', 'Slow 4G', 'Fast 4G']).optional()
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

export const emulate = {
  name: 'chrome-devtools.emulate',
  description: 'Emulate network and CPU conditions',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',               // MCP name
      'emulate', // Actual MCP tool name
      validated                         // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true };
  }
};

// Type exports
export type EmulateInput = z.infer<typeof InputSchema>;
export type EmulateOutput = z.infer<typeof OutputSchema>;
