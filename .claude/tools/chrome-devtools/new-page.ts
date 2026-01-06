// Wrapper for chrome-devtools new_page tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { estimateTokens } from '../config/lib/response-utils.js';
// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================
const InputSchema = z.object({
  url: z.string().url().describe('URL to load in new page'),
  timeout: z.number().int().optional().describe('Maximum wait time in milliseconds')
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
export const newPage = {
  name: 'chrome-devtools.new-page',
  description: 'Create a new browser page',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);
    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',                 // MCP name
      'new_page', // Actual MCP tool name
      validated                          // Pass params directly
    );
    // Return filtered result (token efficient)
    const result = { success: true };
    return { ...result, estimatedTokens: estimateTokens(result) };
  }
};
// Type exports
export type NewPageInput = z.infer<typeof InputSchema>;
export type NewPageOutput = z.infer<typeof OutputSchema>;
