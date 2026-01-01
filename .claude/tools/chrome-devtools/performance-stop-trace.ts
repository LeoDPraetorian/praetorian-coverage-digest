// Wrapper for chrome-devtools performance_stop_trace tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  insights: z.any().optional()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const performanceStopTrace = {
  name: 'chrome-devtools.performance-stop-trace',
  description: 'Stop active performance trace recording',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const insights = await callMCPTool(
      'chrome-devtools',                                // MCP name
      'performance_stop_trace',  // Actual MCP tool name
      validated                                         // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true, insights };
  }
};

// Type exports
export type PerformanceStopTraceInput = z.infer<typeof InputSchema>;
export type PerformanceStopTraceOutput = z.infer<typeof OutputSchema>;
