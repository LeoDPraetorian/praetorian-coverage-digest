// Wrapper for chrome-devtools performance_start_trace tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { estimateTokens } from '../config/lib/response-utils.js';
// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================
const InputSchema = z.object({
  reload: z.boolean().describe('Whether to reload page after starting trace'),
  autoStop: z.boolean().describe('Whether to automatically stop trace')
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
export const performanceStartTrace = {
  name: 'chrome-devtools.performance-start-trace',
  description: 'Start a performance trace recording',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);
    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',                                 // MCP name
      'performance_start_trace',  // Actual MCP tool name
      validated                                          // Pass params directly
    );
    // Return filtered result (token efficient)
    const result = { success: true };
    return { ...result, estimatedTokens: estimateTokens(result) };
  }
};
// Type exports
export type PerformanceStartTraceInput = z.infer<typeof InputSchema>;
export type PerformanceStartTraceOutput = z.infer<typeof OutputSchema>;
