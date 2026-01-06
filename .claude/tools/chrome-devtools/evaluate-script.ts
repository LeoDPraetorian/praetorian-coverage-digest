// Wrapper for chrome-devtools evaluate_script tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { estimateTokens } from '../config/lib/response-utils.js';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  function: z.string().min(1).describe('JavaScript function to execute'),
  args: z.array(z.object({ uid: z.string() })).optional().describe('Optional element arguments')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  estimatedTokens: z.number()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const evaluateScript = {
  name: 'chrome-devtools.evaluate-script',
  description: 'Evaluate JavaScript in the page',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const result = await callMCPTool(
      'chrome-devtools',                        // MCP name
      'evaluate_script', // Actual MCP tool name
      validated                                 // Pass params directly
    );

    // Return filtered result (token efficient)
    const output = { success: true, result };
    return { ...output, estimatedTokens: estimateTokens(output) };
  }
};

// Type exports
export type EvaluateScriptInput = z.infer<typeof InputSchema>;
export type EvaluateScriptOutput = z.infer<typeof OutputSchema>;
