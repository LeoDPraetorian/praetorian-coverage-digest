// Wrapper for chrome-devtools performance_analyze_insight tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  insightSetId: z.string().min(1).describe('The id for the specific insight set'),
  insightName: z.string().min(1).describe('The name of the Insight (e.g., "DocumentLatency")')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  insight: z.any().optional()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const performanceAnalyzeInsight = {
  name: 'chrome-devtools.performance-analyze-insight',
  description: 'Analyze a performance insight',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const insight = await callMCPTool(
      'chrome-devtools',                                   // MCP name
      'mcp__chrome-devtools__performance_analyze_insight', // Actual MCP tool name
      validated                                            // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true, insight };
  }
};

// Type exports
export type PerformanceAnalyzeInsightInput = z.infer<typeof InputSchema>;
export type PerformanceAnalyzeInsightOutput = z.infer<typeof OutputSchema>;
